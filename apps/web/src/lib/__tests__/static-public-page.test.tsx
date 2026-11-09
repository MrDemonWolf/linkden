import { describe, expect, it } from "vitest";
import { createPublicationArtifacts } from "../../../../../scripts/lib/public-artifacts";
import { publicPayloadJson, renderStaticDocument } from "../../components/public/static-document";
import { prepareStaticPublicPage } from "../static-public-page";

function input() {
	const rows = [
		{ type: "header", title: "My work", config: { layout: "list" } },
		{
			type: "link",
			title: "Website",
			icon: "lucide:link",
			url: "https://example.com/",
			config: {},
		},
		{ type: "text", config: { body: "Profile notes" } },
		{
			type: "embed",
			title: "Video",
			embedType: "youtube",
			embedUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
			config: {},
		},
		{ type: "connect", title: "Connect With Me", config: {} },
		{ type: "vcard", title: "Save contact", config: { fullName: "Ada Example", phone: "+1234" } },
		{ type: "location", title: "Chicago", config: { address: "Chicago", linkType: "google" } },
		{
			type: "image",
			title: "Gallery",
			config: { src: "https://example.com/image.png", alt: "Landscape" },
		},
		{ type: "divider", config: {} },
	];
	return {
		revision: "static-test",
		publicOrigin: "https://profile.example.test",
		builtAt: "2026-11-05T12:00:00.000Z",
		profile: { name: "Ada", image: null, bio: "Hello", isVerified: false },
		settings: {
			theme_preset: "default",
			contact_form_enabled: "true",
			captcha_provider: "turnstile",
			captcha_site_key: "public-site-key",
			vcard_enabled: "true",
			email_api_key: "PRIVATE_SECRET",
		},
		blocks: rows.map((row, position) => ({
			...row,
			id: `block-${position}`,
			position,
			isEnabled: true,
			status: "published",
			config: JSON.stringify(row.config),
		})),
		socialNetworks: [{ slug: "github", url: "https://github.com/ada", isActive: true }],
	};
}

describe("shared static profile renderer", () => {
	it("renders all nine existing block types, static vCards, social icons and gated embeds", async () => {
		const artifacts = createPublicationArtifacts(input());
		const { payload, files } = await prepareStaticPublicPage(
			artifacts.snapshot,
			"https://api.example.test/api/contact",
		);
		const html = await renderStaticDocument(artifacts.snapshot, payload, {
			script: "/assets/client.js",
			stylesheet: "/assets/style.css",
		});
		const document = new DOMParser().parseFromString(html, "text/html");
		for (const text of [
			"My work",
			"Website",
			"Profile notes",
			"Video",
			"Connect With Me",
			"Save contact",
			"Chicago",
			"Load YouTube",
		])
			expect(document.getElementById("public-profile")?.textContent).toContain(text);
		expect(payload.data.blocks).toHaveLength(9);
		expect(payload.data.blocks[1]?.iconSvg?.kind).toBe("lucide");
		expect(document.querySelector(".ld-divider-block")).not.toBeNull();
		expect(document.querySelector('nav[aria-label="Social links"]')).not.toBeNull();
		expect(document.querySelector<HTMLImageElement>('img[alt="Landscape"]')?.style.objectFit).toBe(
			"contain",
		);
		expect(html).not.toContain("<iframe");
		expect(html).not.toContain("PRIVATE_SECRET");
		expect(html).not.toContain("/trpc");
		expect(html).not.toContain("get-session");
		expect(html).not.toContain("/api/vcard");
		expect([...files.values()].join("\n")).toContain("FN:Ada Example");
		expect(payload.blockVcardHrefs["block-5"]).toMatch(/^\/assets\/contact-[a-f0-9]+\.vcf$/);
	});

	it("preserves an explicit image crop setting through validation, snapshot and rendering", async () => {
		const raw = input();
		const image = raw.blocks.find((row) => row.type === "image");
		if (!image) throw new Error("Image fixture missing");
		image.config = JSON.stringify({
			src: "https://example.com/image.png",
			alt: "Cropped landscape",
			aspect: "1:1",
			fit: "cover",
		});
		const artifacts = createPublicationArtifacts(raw);
		const { payload } = await prepareStaticPublicPage(
			artifacts.snapshot,
			"https://api.example.test/api/contact",
		);
		const html = await renderStaticDocument(artifacts.snapshot, payload, {
			script: "/assets/client.js",
			stylesheet: "/assets/style.css",
		});
		const document = new DOMParser().parseFromString(html, "text/html");
		const picture = document.querySelector<HTMLImageElement>('img[alt="Cropped landscape"]');
		expect(picture?.style.objectFit).toBe("cover");
		expect(picture?.parentElement?.style.aspectRatio).toBe("1 / 1");
	});

	it("requires explicit public contact and CAPTCHA instead of silently dropping contact forms", async () => {
		const artifacts = createPublicationArtifacts(input());
		await expect(prepareStaticPublicPage(artifacts.snapshot)).rejects.toThrow(
			/explicit public contact/,
		);
	});

	it("keeps scheduled future content out of HTML and safely escapes inert hydration JSON", async () => {
		const raw = input();
		raw.profile.bio = "</script><script>INJECTED</script>";
		const artifacts = createPublicationArtifacts({
			...raw,
			blocks: [
				...raw.blocks,
				{
					id: "future",
					type: "text",
					config: JSON.stringify({ body: "FUTURE_PRIVATE" }),
					position: 20,
					isEnabled: true,
					status: "published",
					scheduledStart: "2026-11-06T00:00:00.000Z",
				},
			],
		});
		const { payload } = await prepareStaticPublicPage(
			artifacts.snapshot,
			"https://api.example.test/api/contact",
		);
		expect(publicPayloadJson(payload)).not.toContain("<");
		const html = await renderStaticDocument(artifacts.snapshot, payload, {
			script: "/client.js",
			stylesheet: "/style.css",
		});
		expect(html).not.toContain("FUTURE_PRIVATE");
		expect(html).not.toContain("<script>INJECTED");
		expect(artifacts.snapshot.nextVisibilityBoundary).toBe("2026-11-06T00:00:00.000Z");
	});
});

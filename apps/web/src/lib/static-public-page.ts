import { createHash } from "node:crypto";
import { socialBrandMap } from "@linkden/ui/social-brands";
import { resolvePublicPageSettings } from "@linkden/validators/public-settings";
import {
	generateVCardString,
	hasVcardContent,
	safeParseVcardData,
} from "@linkden/validators/vcard";
import type { StaticPagePayload } from "@/components/public/static-page";
import type { createPublicationArtifacts } from "../../../../scripts/lib/public-artifacts";
import { withResolvedIcons } from "./block-icons";
import { publicContactEndpoint } from "./public-contact";

type Snapshot = ReturnType<typeof createPublicationArtifacts>["snapshot"];

/** Map the compiler's allowlisted snapshot to the existing profile contract. No DB or env reads. */
export async function prepareStaticPublicPage(snapshot: Snapshot, contactAction?: string) {
	const s = snapshot.settings;
	const files = new Map<string, string>();
	const blockVcardHrefs: Record<string, string> = Object.create(null);
	const cardFile = (value?: string | null) => {
		const card = safeParseVcardData(value);
		if (!hasVcardContent(card)) return null;
		const contents = generateVCardString(card);
		const file = `assets/contact-${createHash("sha256").update(contents).digest("hex").slice(0, 20)}.vcf`;
		files.set(file, contents);
		return `/${file}`;
	};
	const cards = snapshot.blocks.filter((b) => b.type === "vcard");
	for (const block of cards) {
		const href = cardFile(block.config);
		if (!href) throw new Error(`Visible vCard block ${block.id} has no contact data`);
		blockVcardHrefs[block.id] = href;
	}
	const globalVcardHref =
		s.vcard_enabled === "true"
			? cards[0]
				? blockVcardHrefs[cards[0].id]!
				: cardFile(s.vcard_data)
			: null;
	const hasContact = snapshot.blocks.some((b) => b.type === "connect");
	const contactEndpoint = contactAction ? publicContactEndpoint(contactAction) : null;
	if (
		hasContact &&
		(!contactEndpoint ||
			!["turnstile", "recaptcha", "hcaptcha"].includes(s.captcha_provider ?? "") ||
			!s.captcha_site_key)
	) {
		throw new Error(
			"Visible contact forms require an explicit public contact action and configured CAPTCHA",
		);
	}
	const payload: StaticPagePayload = {
		initialColorMode: s.default_color_mode === "dark" ? "dark" : "light",
		contactEndpoint: hasContact ? contactEndpoint : null,
		globalVcardHref,
		blockVcardHrefs,
		data: {
			profile: {
				name: s.profile_name || snapshot.profile.name,
				image: s.avatar_url || snapshot.profile.image,
				bio: s.bio || snapshot.profile.bio,
				isVerified:
					s.verified_badge === undefined
						? snapshot.profile.isVerified
						: s.verified_badge === "true",
			},
			blocks: await withResolvedIcons(snapshot.blocks.map((b) => ({ ...b, socialIcons: null }))),
			socialNetworks: snapshot.socialNetworks.map((network) => {
				const brand = socialBrandMap.get(network.slug);
				if (!brand) throw new Error(`Unknown public social network ${network.slug}`);
				return {
					slug: network.slug,
					url: network.url,
					name: brand.name,
					hex: brand.hex,
					svgPath: brand.svgPath,
				};
			}),
			settings: resolvePublicPageSettings(s, !!globalVcardHref),
		},
	};
	return { payload, files };
}

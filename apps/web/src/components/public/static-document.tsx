import { renderToReadableStream } from "react-dom/server";
import type { createPublicationArtifacts } from "../../../../../scripts/lib/public-artifacts";
import { ColorModeScript } from "./color-mode-script";
import { StaticPage, type StaticPagePayload } from "./static-page";

type Snapshot = ReturnType<typeof createPublicationArtifacts>["snapshot"];

/** Escape JSON for an inert script element; owner text must never close the element. */
export const publicPayloadJson = (payload: StaticPagePayload) =>
	JSON.stringify(payload)
		.replace(/</g, "\\u003c")
		.replace(/\u2028/g, "\\u2028")
		.replace(/\u2029/g, "\\u2029");

export async function renderStaticDocument(
	snapshot: Snapshot,
	payload: StaticPagePayload,
	assets: { script: string; stylesheet: string },
) {
	const title = payload.data.settings.seoTitle || "LinkDen";
	const description = payload.data.settings.seoDescription || "Your personal link-in-bio page";
	const stream = await renderToReadableStream(
		<html lang={payload.data.settings.siteLanguage || "en"} data-ld-mode={payload.initialColorMode}>
			{/* biome-ignore lint/style/noHeadElement: standalone static HTML, outside the Next application */}
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>{title}</title>
				<meta name="description" content={description} />
				<link rel="canonical" href={`${snapshot.publicOrigin}/`} />
				<meta property="og:type" content="website" />
				<meta property="og:title" content={title} />
				<meta property="og:description" content={description} />
				<meta property="og:url" content={`${snapshot.publicOrigin}/`} />
				<meta name="twitter:card" content="summary_large_image" />
				<meta name="twitter:title" content={title} />
				<meta name="twitter:description" content={description} />
				{payload.data.settings.seoOgImage && (
					<>
						<meta property="og:image" content={payload.data.settings.seoOgImage} />
						<meta name="twitter:image" content={payload.data.settings.seoOgImage} />
					</>
				)}
				{snapshot.settings.branding_favicon_url && (
					<link rel="icon" href={snapshot.settings.branding_favicon_url} />
				)}
				<link rel="stylesheet" href={assets.stylesheet} />
				<ColorModeScript defaultColorMode={payload.data.settings.defaultColorMode} />
			</head>
			<body className="public-scope">
				<div id="public-profile">
					<StaticPage payload={payload} />
				</div>
				<script
					id="public-profile-data"
					type="application/json"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: escaped inert JSON, never executable owner text
					dangerouslySetInnerHTML={{ __html: publicPayloadJson(payload) }}
				/>
				<script type="module" src={assets.script} />
			</body>
		</html>,
	);
	await stream.allReady;
	return await new Response(stream).text();
}

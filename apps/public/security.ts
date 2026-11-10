import { createHash } from "node:crypto";
import { publicContactEndpoint } from "../web/src/lib/public-contact";

interface StaticSecurityOptions {
	/** Trusted output of renderStaticDocument, never arbitrary owner HTML. */
	html: string;
	contactAction?: string | null;
	captchaProvider?: string | null;
	imageOrigins?: readonly string[];
	customCss?: string | null;
}

const CAPTCHA_SOURCES = {
	turnstile: {
		script: ["https://challenges.cloudflare.com"],
		style: [],
		connect: ["https://challenges.cloudflare.com"],
	},
	recaptcha: {
		script: ["https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/"],
		style: [],
		connect: ["https://www.google.com/recaptcha/"],
	},
	hcaptcha: {
		script: ["https://hcaptcha.com", "https://*.hcaptcha.com"],
		style: ["https://hcaptcha.com", "https://*.hcaptcha.com"],
		connect: ["https://hcaptcha.com", "https://*.hcaptcha.com"],
	},
} as const;

function imageOrigin(value: string): string {
	const url = new URL(value);
	if (
		!["https:", "http:"].includes(url.protocol) ||
		url.username ||
		url.password ||
		url.pathname !== "/" ||
		url.search ||
		url.hash ||
		/[\s;,'"<>]/.test(value)
	)
		throw new Error("Static image sources must be HTTP(S) origins");
	return url.origin;
}

/** Hash exact executable inline bytes; the inert JSON payload needs no script permission. */
export function inlineScriptHashes(html: string): string[] {
	const hashes = new Set<string>();
	for (const [, attributes = "", body = ""] of html.matchAll(
		/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi,
	)) {
		if (/\bsrc\s*=/i.test(attributes)) continue;
		const type = attributes.match(/\btype\s*=\s*["']([^"']*)["']/i)?.[1]?.toLowerCase();
		if (type && !["module", "text/javascript", "application/javascript"].includes(type)) continue;
		if (body) hashes.add(`'sha256-${createHash("sha256").update(body).digest("base64")}'`);
	}
	return [...hashes];
}

/** Replacement at the old URL: no fetch handler, offline cache, timer, or API call. */
export const RETIRED_PUBLIC_SERVICE_WORKER = `// LinkDen public service worker retirement.
self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    await Promise.allSettled([
      caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("linkden-")).map(key => caches.delete(key)))),
      self.registration.navigationPreload?.disable()
    ]);
    await self.clients.claim();
    await self.registration.unregister();
  })());
});
`;

/** Static-asset response policy. */
export function createStaticSecurityFiles(options: StaticSecurityOptions): Map<string, string> {
	const provider = options.contactAction ? options.captchaProvider : null;
	if (options.contactAction && (!provider || !Object.hasOwn(CAPTCHA_SOURCES, provider)))
		throw new Error("Unsupported static CAPTCHA provider");
	const captcha = provider ? CAPTCHA_SOURCES[provider as keyof typeof CAPTCHA_SOURCES] : null;
	const images = [...new Set((options.imageOrigins ?? []).map(imageOrigin))].sort();
	const contact = options.contactAction ? publicContactEndpoint(options.contactAction) : null;
	const policy = [
		"default-src 'self'",
		["script-src 'self'", ...inlineScriptHashes(options.html), ...(captcha?.script ?? [])].join(
			" ",
		),
		"script-src-attr 'none'",
		["style-src 'self' 'unsafe-inline'", ...(captcha?.style ?? [])].join(" "),
		// Existing owner CSS can reference HTTPS backgrounds. Keep that behavior
		// while the build's separate custom-css-media-review gate remains pending.
		[
			"img-src 'self' data: blob:",
			...(options.customCss?.trim() ? ["https:"] : []),
			...images,
		].join(" "),
		"font-src 'self' data:",
		// Custom embeds are already validated HTTPS and retain the existing consent gate.
		"frame-src https:",
		["connect-src 'self'", ...(contact ? [contact] : []), ...(captcha?.connect ?? [])].join(" "),
		"media-src 'self'",
		"object-src 'none'",
		"base-uri 'none'",
		"frame-ancestors 'none'",
		"form-action 'self'",
		"worker-src 'self'",
	].join("; ");
	const headers = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Content-Security-Policy: ${policy};

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/sw.js
  Cache-Control: no-store
  Service-Worker-Allowed: /
`;
	// Fail before upload if a line exceeds Cloudflare's supported _headers limit.
	if (headers.split("\n").some((line) => line.length > 2_000)) {
		throw new Error("Static security policy exceeds the Cloudflare header line limit");
	}
	return new Map([
		["_headers", headers],
		["sw.js", RETIRED_PUBLIC_SERVICE_WORKER],
	]);
}

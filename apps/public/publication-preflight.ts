/** Build metadata only. This boundary never resolves hosts or fetches dependency URLs. */
interface MediaManifest {
	pending: readonly string[];
	media: { dependencies: readonly { url: string }[] };
}

const BLOCKED_MEDIA_GATES = new Set([
	"referenced-media-bundle",
	"unresolved-local-media",
	"external-http-media-review",
	"custom-css-media-review",
]);

function loopback(hostname: string) {
	const host = hostname.replace(/\.$/, "");
	return (
		host === "localhost" ||
		host.endsWith(".localhost") ||
		/^127\./.test(host) ||
		host === "0.0.0.0" ||
		host === "[::]" ||
		host === "[::1]" ||
		/^\[::ffff:7f[0-9a-f]{2}:/i.test(host)
	);
}

function uploadPath(pathname: string) {
	let path = pathname;
	// Reject encoded aliases as dependencies too; never normalize them into a read.
	for (let depth = 0; depth < 3; depth++) {
		if (/^\/api\/images(?:\/|$)/i.test(path)) return true;
		try {
			const decoded = decodeURIComponent(path);
			if (decoded === path) break;
			path = decoded;
		} catch {
			break;
		}
	}
	return false;
}

/** CI-only: local artifact/fixture building intentionally retains its existing media behavior. */
export function assertPublicationMediaReady(publicOrigin: string, manifest: MediaManifest): void {
	const origin = new URL(publicOrigin);
	if (origin.protocol !== "https:" || loopback(origin.hostname))
		throw new Error("Publication requires a public HTTPS origin");
	if (manifest.pending.some((gate) => BLOCKED_MEDIA_GATES.has(gate)))
		throw new Error("Publication still has unresolved media or custom CSS dependencies");
	for (const dependency of manifest.media.dependencies) {
		const url = new URL(dependency.url);
		if (url.protocol !== "https:" || loopback(url.hostname))
			throw new Error("HTTPS publication cannot retain HTTP or loopback media dependencies");
		if (uploadPath(url.pathname))
			throw new Error("Publication uploads require an approved image origin and bundled assets");
	}
}

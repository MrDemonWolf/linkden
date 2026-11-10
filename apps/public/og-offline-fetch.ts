/** Isolated renderer fetch: decode bundled inline WASM; deny every network entry point. */
export function createOfflineOgFetch(onNetworkAttempt: () => void) {
	const deny = () => {
		onNetworkAttempt();
		throw new Error("Offline OG rendering cannot load remote assets");
	};
	return Object.assign(
		async (input: Parameters<typeof fetch>[0]) => {
			const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
			const prefix = "data:application/octet-stream;base64,";
			if (url.startsWith(prefix) && url.length < 2 * 1024 * 1024) {
				const bytes = Buffer.from(url.slice(prefix.length), "base64");
				if (bytes.subarray(0, 4).toString("hex") === "0061736d")
					return new Response(bytes, { headers: { "content-type": "application/wasm" } });
			}
			return deny();
		},
		{ preconnect: deny },
	);
}

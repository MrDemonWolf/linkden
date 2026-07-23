const IMAGE_KEY_RE = /\/api\/images\/([A-Za-z0-9._/-]+)/g;

/** Extract R2 object keys referenced by any `/api/images/<key>` URL in the text. */
export function extractImageKeys(values: Iterable<string>): Set<string> {
	const keys = new Set<string>();
	for (const value of values) {
		if (!value) continue;
		for (const m of value.matchAll(IMAGE_KEY_RE)) {
			if (m[1]) keys.add(m[1]);
		}
	}
	return keys;
}

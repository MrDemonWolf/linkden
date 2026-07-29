// Single source of truth for the app version: root version.json.
import versionJson from "../../../../version.json";

export const APP_VERSION = (versionJson as { version: string }).version;

type Parsed = { main: [number, number, number]; pre: string[] };

function parse(v: string): Parsed {
	const parts = v.replace(/^v/, "").split("-");
	const nums = (parts[0] ?? "").split(".").map((n) => Number.parseInt(n, 10) || 0);
	const pre = parts[1];
	return {
		main: [nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0],
		pre: pre ? pre.split(".") : [],
	};
}

/**
 * Semantic-version comparison. Returns -1 if a < b, 0 if equal, 1 if a > b.
 * Follows SemVer precedence: a prerelease is lower than its release
 * (1.0.0-rc < 1.0.0), and prerelease identifiers compare left-to-right with
 * numeric identifiers ordered below alphanumeric ones.
 */
export function compareSemver(a: string, b: string): number {
	const pa = parse(a);
	const pb = parse(b);
	for (let i = 0; i < 3; i++) {
		const av = pa.main[i] ?? 0;
		const bv = pb.main[i] ?? 0;
		if (av !== bv) return av < bv ? -1 : 1;
	}
	// A version WITH a prerelease has lower precedence than one without.
	if (pa.pre.length === 0 && pb.pre.length > 0) return 1;
	if (pa.pre.length > 0 && pb.pre.length === 0) return -1;
	const n = Math.max(pa.pre.length, pb.pre.length);
	for (let i = 0; i < n; i++) {
		const x = pa.pre[i];
		const y = pb.pre[i];
		if (x === undefined) return -1; // fewer identifiers → lower precedence
		if (y === undefined) return 1;
		const xn = /^\d+$/.test(x);
		const yn = /^\d+$/.test(y);
		if (xn && yn) {
			const dx = Number.parseInt(x, 10);
			const dy = Number.parseInt(y, 10);
			if (dx !== dy) return dx < dy ? -1 : 1;
		} else if (xn) {
			return -1; // numeric identifiers rank below alphanumeric
		} else if (yn) {
			return 1;
		} else if (x !== y) {
			return x < y ? -1 : 1;
		}
	}
	return 0;
}

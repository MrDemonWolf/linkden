import { describe, expect, it } from "vitest";
import { rateLimitKey, trpcProcedurePaths } from "../lib/rate-limit";

describe("rateLimitKey", () => {
	it("keys IPv4 on the full address", () => {
		expect(rateLimitKey("203.0.113.7")).toBe("203.0.113.7");
	});

	it("collapses IPv6 to its /64 so rotating inside it shares one bucket", () => {
		const a = rateLimitKey("2001:db8:abcd:12:1111:2222:3333:4444");
		const b = rateLimitKey("2001:0db8:abcd:0012:ffff::1");
		expect(a).toBe("2001:db8:abcd:12::/64");
		expect(b).toBe(a);
		expect(rateLimitKey("2001:db8:abcd:13::1")).not.toBe(a);
	});

	it("expands :: in the network half", () => {
		expect(rateLimitKey("2001:db8::1")).toBe("2001:db8:0:0::/64");
		expect(rateLimitKey("::1")).toBe("0:0:0:0::/64");
	});

	it("treats IPv4-mapped IPv6 as the IPv4 address", () => {
		expect(rateLimitKey("::ffff:198.51.100.2")).toBe("198.51.100.2");
	});

	it("falls back to the raw value for missing or malformed input", () => {
		expect(rateLimitKey(undefined)).toBe("");
		expect(rateLimitKey("not:an:ip:::")).toBe("not:an:ip:::");
	});
});

describe("trpcProcedurePaths", () => {
	const paths = (url: string) => trpcProcedurePaths(new URL(url, "https://site.test"));

	it("returns the single procedure of an unbatched call", () => {
		expect(paths("/trpc/public.submitContact")).toEqual(["public.submitContact"]);
	});

	it("lists every procedure of a batch, wherever it sits", () => {
		expect(paths("/trpc/settings.update,public.trackView,public.trackView?batch=1")).toEqual([
			"settings.update",
			"public.trackView",
			"public.trackView",
		]);
	});

	it("decodes before splitting, exactly like tRPC", () => {
		expect(paths("/trpc/public%2EtrackView%2Cpublic.submitContact?batch=1")).toEqual([
			"public.trackView",
			"public.submitContact",
		]);
	});

	it("does not split without ?batch=1", () => {
		expect(paths("/trpc/a,b")).toEqual(["a,b"]);
	});

	it("returns null for undecodable paths", () => {
		expect(paths("/trpc/%E0%A4%A")).toBeNull();
	});
});

import { env } from "@linkden/env/web";
import { hasAnalyticsConsent } from "@/components/public/consent-banner";

/**
 * Fire-and-forget click tracking for public blocks.
 *
 * Plain fetch instead of a tRPC `useMutation`: it must survive the page
 * unloading behind an outbound link (`keepalive`), and it must never surface
 * an error toast to a visitor. Wire format matches `httpBatchLink` with no
 * transformer (utils/trpc.ts): POST /trpc/<path> with the raw input as JSON.
 * Referrer / UA / country are derived server-side from request headers.
 */
export function trackClick(blockId: string, opts?: { preview?: boolean }): void {
	if (opts?.preview || typeof window === "undefined" || !hasAnalyticsConsent()) return;
	fetch(`${env.NEXT_PUBLIC_SERVER_URL}/trpc/public.trackClick`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ blockId }),
		credentials: "include",
		keepalive: true,
	}).catch(() => {});
}

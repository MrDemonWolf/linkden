/**
 * Purge cached tRPC GET responses from Cloudflare edge cache.
 * Called after mutations that modify public-facing data.
 *
 * httpLink sends queries as GET: /trpc/<procedure>?input=<encoded>
 * For parameterless queries the URL is: /trpc/<procedure>?input=%7B%7D
 */
export async function purgePublicCache(apiBaseUrl: string) {
  try {
    const cfCaches = globalThis.caches as unknown as { default: Cache };
    if (!cfCaches?.default) return;

    const cache = cfCaches.default;
    // Public procedures that visitors hit (parameterless GET queries)
    const procedures = ["settings.getPublic", "links.list"];

    const deletes = procedures.map((proc) => {
      const url = `${apiBaseUrl}/trpc/${proc}?input=%7B%7D`;
      return cache.delete(new Request(url)).catch(() => {});
    });
    await Promise.allSettled(deletes);
  } catch {
    // Cache API not available in dev/test — silently ignore
  }
}

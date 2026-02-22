import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Fetch published custom pages from the API
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
      const res = await fetch(`${apiUrl}/trpc/pages.listPublished`, {
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const json = (await res.json()) as { result?: { data?: { slug: string; updatedAt: string }[] } };
        const pages = json?.result?.data ?? [];
        for (const page of pages) {
          staticRoutes.push({
            url: `${baseUrl}/p/${page.slug}`,
            lastModified: new Date(page.updatedAt),
            changeFrequency: "weekly",
            priority: 0.5,
          });
        }
      }
    }
  } catch {
    // Silently fail — sitemap will just have static routes
  }

  return staticRoutes;
}

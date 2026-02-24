import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: ["/admin/", "/api/"],
			},
		],
		sitemap: `${process.env.NEXT_PUBLIC_SERVER_URL || "https://example.com"}/sitemap.xml`,
	};
}

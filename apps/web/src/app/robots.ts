import { env } from "@linkden/env/web";
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
		sitemap: new URL("/sitemap.xml", env.NEXT_PUBLIC_SITE_URL).toString(),
	};
}

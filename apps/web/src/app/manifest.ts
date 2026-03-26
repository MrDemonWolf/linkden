import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/admin",
    name: "LinkDen Admin",
    short_name: "LinkDen",
    description: "LinkDen admin panel — manage your link-in-bio page",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/favicon/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/favicon/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

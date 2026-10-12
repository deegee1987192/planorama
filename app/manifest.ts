import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Planorama",
    short_name: "Planorama",
    description: "Your personal organizer",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F8F1E7",
    theme_color: "#8E2C22",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

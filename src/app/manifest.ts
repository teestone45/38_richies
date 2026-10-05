import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "38 RICHES | Built Different",
    short_name: "38 RICHES",
    description: "Shop the 38 RICHES streetwear collection.",
    start_url: "/",
    display: "standalone",
    background_color: "#28191c",
    theme_color: "#28191c",
    icons: [
      {
        src: "/images/38-richies-embroidered.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
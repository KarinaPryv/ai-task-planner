import type { MetadataRoute } from "next";

// PWA — installable, without an offline mode (Architecture.md §PWA): this
// manifest and the no-op service worker (PwaRegister.tsx) exist purely to
// satisfy install criteria, not to cache anything.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yasno",
    short_name: "Yasno",
    description: "Yasno перетворює хаос думок на план дня",
    start_url: "/",
    display: "standalone",
    lang: "uk",
    background_color: "#FBF9F6",
    theme_color: "#FBF9F6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

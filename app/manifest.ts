import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KP Hauling Backend",
    short_name: "KP Hauling",
    description: "Driver dispatch, inventory, jobs, and availability for KP Hauling & Dumpster Services.",
    start_url: "/hauling",
    scope: "/hauling",
    display: "standalone",
    background_color: "#f5f3ef",
    theme_color: "#22623f",
    icons: [
      {
        src: "/hauling/icon.jpg",
        sizes: "200x200",
        type: "image/jpeg"
      }
    ]
  };
}

/* eslint-disable @next/next/no-img-element */

export function BrandLogo({ size = "md" }: { size?: "md" | "lg" }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const dimensions = size === "lg" ? "h-12 w-12" : "h-11 w-11";

  return (
    <img
      src={`${basePath}/kp-hauling-logo.jpg?v=20260615`}
      alt="KP Hauling & Dumpster Services"
      className={`${dimensions} rounded object-cover ring-1 ring-kp-line`}
    />
  );
}

import Image from "next/image";

export function BrandLogo({ size = "md" }: { size?: "md" | "lg" }) {
  const pixels = size === "lg" ? 48 : 44;
  const dimensions = size === "lg" ? "h-12 w-12" : "h-11 w-11";

  return (
    <Image
      src="/kp-hauling-logo.jpg"
      alt="KP Hauling & Dumpster Services"
      width={pixels}
      height={pixels}
      priority={size === "lg"}
      className={`${dimensions} rounded object-cover ring-1 ring-kp-line`}
    />
  );
}

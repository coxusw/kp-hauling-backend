const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/hauling";

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath
  }
};

export default nextConfig;

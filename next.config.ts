import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Authentication requires a server; do not restore static export or a basePath.
  trailingSlash: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  experimental: { serverActions: { bodySizeLimit: "16kb" } },
};

export default nextConfig;

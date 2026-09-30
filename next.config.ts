import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: process.env.NODE_ENV === "production" ? "/Centralized-Secrets-Encryption-Management-Dashboard" : "",
  images: { unoptimized: true },
};

export default nextConfig;

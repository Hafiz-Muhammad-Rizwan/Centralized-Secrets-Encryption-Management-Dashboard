import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  // Only GitHub Pages needs the repository subfolder. Vercel serves at /.
  basePath: process.env.GITHUB_PAGES === "true" && process.env.VERCEL !== "1"
    ? "/Centralized-Secrets-Encryption-Management-Dashboard"
    : "",
  images: { unoptimized: true },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker - enabled via DOCKER_BUILD env var
  // Local dev: pnpm dev (no standalone needed)
  // Docker: Dockerfile sets DOCKER_BUILD=true
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,
};

export default nextConfig;

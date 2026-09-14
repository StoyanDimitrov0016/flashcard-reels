import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  turbopack: {
    root: path.join(import.meta.dirname, "../.."),
  },
  transpilePackages: ["@flashcard-reels/design-tokens"],
};

export default nextConfig;

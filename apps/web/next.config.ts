import type { NextConfig } from "next";

import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  turbopack: {
    root: path.join(import.meta.dirname, "../.."),
  },
  transpilePackages: ["@flashcard-reels/design-tokens"],
};

export default nextConfig;

import type { NextConfig } from "next";

import path from "node:path";

const nextConfig: NextConfig = {
  // AGENTS.md is curated by hand; it already points agents at the bundled Next.js docs.
  agentRules: false,
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  transpilePackages: ["@flashcard-reels/design-tokens"],
  turbopack: {
    root: path.join(import.meta.dirname, "../.."),
  },
  // Link hrefs are type-checked against the routes that exist.
  typedRoutes: true,
};

export default nextConfig;

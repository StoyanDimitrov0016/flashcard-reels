import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.join(projectDirectory, "src"),
    },
  },
  test: {
    environment: "node",
    fsModuleCache: true,
    include: ["tests/**/*.test.ts"],
    pool: "threads",
  },
});

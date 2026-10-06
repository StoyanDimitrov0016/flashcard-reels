import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.join(projectDirectory, "src"),
      // Transform the actual renderer source so native boundaries can use the existing UI mocks.
      "react-native-marked": path.join(
        projectDirectory,
        "../../node_modules/react-native-marked/src/index.ts"
      ),
      "@jsamr/react-native-li": path.join(
        projectDirectory,
        "../../node_modules/@jsamr/react-native-li/src/index.ts"
      ),
    },
  },
  test: {
    environment: "node",
    fsModuleCache: true,
    include: ["tests/**/*.test.{ts,tsx}"],
    pool: "threads",
  },
});

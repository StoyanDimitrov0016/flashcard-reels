import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  driver: "expo",
  out: "./drizzle",
  schema: "./src/infrastructure/sqlite/schema.ts",
});

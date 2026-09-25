import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("server environment boundary", () => {
  it("marks the environment module as server-only", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/server/env.ts"), "utf8");

    expect(source).toContain('import "server-only";');
  });
});

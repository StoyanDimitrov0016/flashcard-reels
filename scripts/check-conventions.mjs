import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));
const sourceDirectory = path.join(projectDirectory, "..", "src");
const schemaDeclarationPattern = /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*z\./g;
const schemaNamePattern = /^[A-Z][A-Za-z0-9]*Schema$/;
const violations = [];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(entryPath);
      continue;
    }
    if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) {
      continue;
    }

    const source = fs.readFileSync(entryPath, "utf8");
    for (const match of source.matchAll(schemaDeclarationPattern)) {
      const schemaName = match[1];
      if (!schemaNamePattern.test(schemaName)) {
        violations.push(`${path.relative(sourceDirectory, entryPath)}: ${schemaName}`);
      }
    }
  }
}

visit(sourceDirectory);

if (violations.length > 0) {
  console.error("Zod schemas must use PascalCase names ending in Schema:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
} else {
  console.log("Zod schema naming conventions passed.");
}

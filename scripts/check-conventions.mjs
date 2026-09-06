import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));
const sourceDirectory = path.join(projectDirectory, "..", "src");
const schemaDeclarationPattern = /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*z\./g;
const schemaNamePattern = /^[A-Z][A-Za-z0-9]*Schema$/;
const violations = [];
const architectureViolations = [];
const reportSignals = [];

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
    const relativePath = path.relative(sourceDirectory, entryPath).replaceAll(path.sep, "/");
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);
    const isPresentation = /(^|\/)features\/[^/]+\/(components|screens)\//.test(relativePath);
    const isDomain = /(^|\/)features\/[^/]+\/domain\//.test(relativePath);
    const isInfrastructure = /(^|\/)infrastructure\//.test(relativePath);
    if (
      isPresentation &&
      imports.some(
        (specifier) =>
          specifier.startsWith("@/infrastructure/sqlite/") ||
          (specifier.startsWith("@/features/") && specifier.includes("/infrastructure/")) ||
          specifier === "expo-sqlite" ||
          specifier === "better-sqlite3"
      )
    ) {
      architectureViolations.push(`${relativePath}: presentation imports persistence code`);
    }
    if (
      isDomain &&
      imports.some(
        (specifier) =>
          ["react", "react-native", "expo-router", "expo-status-bar", "expo-sqlite"].includes(
            specifier
          ) ||
          specifier.startsWith("@/shared/presentation/") ||
          specifier.includes("/components/")
      )
    ) {
      architectureViolations.push(`${relativePath}: domain imports presentation code`);
    }
    if (
      isInfrastructure &&
      imports.some(
        (specifier) => specifier.includes("/components/") || specifier.includes("/hooks/")
      )
    ) {
      architectureViolations.push(`${relativePath}: infrastructure imports presentation code`);
    }
    if (source.length > 30_000) {
      reportSignals.push(`${relativePath}: large file (${source.split("\n").length} lines)`);
    }
    const effectCount = (source.match(/\buse(?:Layout)?Effect\s*\(/g) ?? []).length;
    if (effectCount > 3) {
      reportSignals.push(`${relativePath}: ${effectCount} React effects`);
    }
    if (/\b(TODO|FIXME|HACK)\b/.test(source)) {
      reportSignals.push(`${relativePath}: TODO/FIXME/HACK marker`);
    }
    for (const match of source.matchAll(schemaDeclarationPattern)) {
      const schemaName = match[1];
      if (!schemaNamePattern.test(schemaName)) {
        violations.push(`${path.relative(sourceDirectory, entryPath)}: ${schemaName}`);
      }
    }
  }
}

visit(sourceDirectory);

if (violations.length > 0 || architectureViolations.length > 0) {
  console.error("Zod schemas must use PascalCase names ending in Schema:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  for (const violation of architectureViolations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
} else {
  console.log("Zod schema naming conventions passed.");
}

if (reportSignals.length > 0) {
  console.log("Architecture report-only signals:");
  for (const signal of reportSignals) {
    console.log(`- ${signal}`);
  }
}

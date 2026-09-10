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
    const isRootComposition = relativePath === "app/_layout.tsx";
    const isPresentation =
      (/(^|\/)features\/[^/]+\/presentation\//.test(relativePath) ||
        /(^|\/)app\/.+\.(ts|tsx)$/.test(relativePath)) &&
      !isRootComposition;
    const isDomain = /(^|\/)features\/[^/]+\/domain\//.test(relativePath);
    const isApplication = /(^|\/)features\/[^/]+\/application\//.test(relativePath);
    const isInfrastructure = /(^|\/)infrastructure\//.test(relativePath);
    const isDeckInstallerInternal = relativePath.startsWith(
      "features/decks/deck-installer/internal/"
    );
    const isLearningEngineInternal = relativePath.startsWith("features/learning-engine/internal/");
    const isLearningEngineDomain = relativePath.startsWith("features/learning-engine/domain/");
    const isDeckInstallerComposition = relativePath === "infrastructure/deck-package-services.ts";
    if (
      !isDeckInstallerInternal &&
      !isDeckInstallerComposition &&
      imports.some((specifier) => specifier.includes("/deck-installer/internal/"))
    ) {
      architectureViolations.push(
        `${relativePath}: imports deck-installer internals instead of its public surface`
      );
    }
    if (imports.includes("ts-fsrs") && !isLearningEngineInternal) {
      architectureViolations.push(
        `${relativePath}: imports ts-fsrs outside learning-engine/internal`
      );
    }
    if (
      isLearningEngineDomain &&
      imports.some(
        (specifier) =>
          specifier === "react" ||
          specifier === "react-native" ||
          specifier === "expo-sqlite" ||
          specifier === "drizzle-orm" ||
          specifier.startsWith("@/infrastructure/") ||
          specifier.includes("/presentation/")
      )
    ) {
      architectureViolations.push(`${relativePath}: learning-engine domain imports platform code`);
    }
    if (
      relativePath.includes("/reels/") &&
      relativePath.includes("/application/") &&
      imports.some(
        (specifier) =>
          specifier.startsWith("@/infrastructure/sqlite/") ||
          specifier.startsWith("drizzle-orm") ||
          specifier === "expo-sqlite"
      )
    ) {
      architectureViolations.push(`${relativePath}: feed composer imports SQLite directly`);
    }
    if (
      relativePath.includes("/study/domain/recurrences") &&
      imports.some((specifier) => specifier === "ts-fsrs")
    ) {
      architectureViolations.push(`${relativePath}: immediate recurrence imports FSRS types`);
    }
    if (
      isPresentation &&
      imports.some(
        (specifier) =>
          specifier.startsWith("@/infrastructure/sqlite/") ||
          (specifier.startsWith("@/features/") && specifier.includes("/infrastructure/")) ||
          specifier.startsWith("drizzle-orm") ||
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
          specifier === "zod" ||
          specifier.startsWith("drizzle-orm") ||
          (specifier.startsWith("@/features/") &&
            (specifier.includes("/presentation/") || specifier.includes("/infrastructure/"))) ||
          specifier.startsWith("@/infrastructure/") ||
          specifier.startsWith("@/shared/presentation/") ||
          specifier.includes("/components/")
      )
    ) {
      architectureViolations.push(`${relativePath}: domain imports presentation code`);
    }
    if (
      isApplication &&
      imports.some(
        (specifier) =>
          (specifier.startsWith("@/features/") &&
            (specifier.includes("/presentation/") || specifier.includes("/infrastructure/"))) ||
          specifier.startsWith("@/infrastructure/sqlite/")
      )
    ) {
      architectureViolations.push(
        `${relativePath}: application imports presentation or infrastructure code`
      );
    }
    if (
      isInfrastructure &&
      imports.some(
        (specifier) => specifier.startsWith("@/features/") && specifier.includes("/presentation/")
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
  if (violations.length > 0) {
    console.error("Zod schema naming failed (expected PascalCase names ending in `Schema`):");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
  }
  if (architectureViolations.length > 0) {
    console.error("Architecture boundaries failed:");
    for (const violation of architectureViolations) {
      console.error(`- ${violation}`);
    }
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

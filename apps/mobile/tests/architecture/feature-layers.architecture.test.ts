import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parseSync, Visitor } from "oxc-parser";
import { ResolverFactory } from "oxc-resolver";
import { describe, expect, it } from "vitest";

const sourceRoot = path.join(process.cwd(), "src");
const resolver = new ResolverFactory({
  tsconfig: { configFile: path.join(process.cwd(), "tsconfig.json") },
  extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  conditionNames: ["react-native", "import", "require", "default"],
});
const CoreLayerPattern = /\/(domain|application)\//;
const AdapterLayerPattern = /\/(infrastructure|internal|presentation)\//;
const NativeDependencyPattern =
  /^(expo(?:-|\/|$)|react(?:-native|-dom)?(?:\/|$)|drizzle-orm(?:\/|$)|ts-fsrs(?:\/|$)|node:)/;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(file);
    }
    return /\.tsx?$/.test(file) ? [file] : [];
  });
}

function relative(file: string): string {
  return path.relative(sourceRoot, file).replaceAll(path.sep, "/");
}

function imports(file: string): string[] {
  const { program } = parseSync(file, readFileSync(file, "utf8"));
  const result: string[] = [];
  function addLiteral(node: { type: string; value?: unknown } | null | undefined): void {
    if (node?.type === "Literal" && typeof node.value === "string") {
      result.push(node.value);
    }
  }
  new Visitor({
    ImportDeclaration: (node) => addLiteral(node.source),
    ExportAllDeclaration: (node) => addLiteral(node.source),
    ExportNamedDeclaration: (node) => addLiteral(node.source),
    ImportExpression: (node) => addLiteral(node.source),
    TSImportType: (node) => addLiteral(node.source),
    CallExpression(node) {
      if (node.callee.type === "Identifier" && node.callee.name === "require") {
        const [argument] = node.arguments;
        addLiteral(argument?.type === "Literal" ? argument : null);
      }
    },
  }).visit(program);
  return result;
}

function resolveLocal(file: string, specifier: string): string | undefined {
  const resolved = resolver.resolveFileSync(file, specifier).path;
  if (!resolved) {
    return undefined;
  }
  const target = path.normalize(resolved);
  return target.startsWith(sourceRoot + path.sep) ? target : undefined;
}

describe("feature responsibility boundaries", () => {
  it("keeps domain and application independent of adapters, UI, and native libraries, including through re-exports", () => {
    const graph = new Map(sourceFiles(sourceRoot).map((file) => [file, imports(file)]));
    const violations = new Set<string>();
    for (const file of graph.keys()) {
      if (!CoreLayerPattern.test(`/${relative(file)}`)) {
        continue;
      }
      const visited = new Set<string>();
      function checkDependency(current: string): void {
        if (visited.has(current)) {
          return;
        }
        visited.add(current);
        for (const specifier of graph.get(current) ?? []) {
          const target = resolveLocal(current, specifier);
          const targetPath = target && `/${relative(target)}`;
          if (
            NativeDependencyPattern.test(specifier) ||
            (targetPath && AdapterLayerPattern.test(targetPath)) ||
            (relative(file).includes("/domain/") && targetPath?.includes("/application/"))
          ) {
            violations.add(`${relative(file)} -> ${relative(current)} -> ${specifier}`);
          } else if (target) {
            checkDependency(target);
          }
        }
      }
      checkDependency(file);
    }
    expect([...violations]).toEqual([]);
  });

  it("limits presentation access to infrastructure to the service-context dependency hooks", () => {
    const violations = sourceFiles(sourceRoot).flatMap((file) => {
      const name = relative(file);
      if (!name.includes("/presentation/")) {
        return [];
      }
      return imports(file)
        .filter((specifier) => {
          const target = resolveLocal(file, specifier);
          if (!target || !/\/(infrastructure|internal)\//.test(`/${relative(target)}`)) {
            return false;
          }
          return !(
            name.includes("/presentation/dependencies/") &&
            relative(target) === "infrastructure/app-services.tsx"
          );
        })
        .map((specifier) => `${name} -> ${specifier}`);
    });
    expect(violations).toEqual([]);
  });
});

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const sourceRoot = path.join(process.cwd(), "src");
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
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true
  );
  const result: string[] = [];
  function visit(node: ts.Node): void {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      result.push(node.moduleSpecifier.text);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      result.push(node.argument.literal.text);
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require")) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      result.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return result;
}

function resolveLocal(file: string, specifier: string): string | undefined {
  let target: string | undefined;
  if (specifier.startsWith("@/")) {
    target = path.join(sourceRoot, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    target = path.resolve(path.dirname(file), specifier);
  }
  return (
    target &&
    [
      target,
      `${target}.ts`,
      `${target}.tsx`,
      path.join(target, "index.ts"),
      path.join(target, "index.tsx"),
    ].find((candidate) => /\.tsx?$/.test(candidate) && existsSync(candidate))
  );
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

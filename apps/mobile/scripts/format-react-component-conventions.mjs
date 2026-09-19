import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const projectDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = path.join(projectDirectory, "src");
const writeChanges = process.argv.includes("--write");

function findTsxFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return findTsxFiles(entryPath);
    }
    return entry.name.endsWith(".tsx") ? [entryPath] : [];
  });
}

function componentName(node) {
  if (ts.isFunctionDeclaration(node) && node.name && /^[A-Z]/.test(node.name.text)) {
    return node.name.text;
  }
  if (
    (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
    ts.isVariableDeclaration(node.parent) &&
    ts.isIdentifier(node.parent.name) &&
    /^[A-Z]/.test(node.parent.name.text)
  ) {
    return node.parent.name.text;
  }
  return null;
}

function unwrapExpression(expression) {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function containsJsx(expression) {
  const current = unwrapExpression(expression);
  if (
    ts.isJsxElement(current) ||
    ts.isJsxSelfClosingElement(current) ||
    ts.isJsxFragment(current)
  ) {
    return true;
  }
  let found = false;
  ts.forEachChild(current, (child) => {
    if (!found && ts.isExpression(child) && containsJsx(child)) {
      found = true;
    }
  });
  return found;
}

function returnsJsx(statement) {
  if (!ts.isReturnStatement(statement) || !statement.expression) {
    return false;
  }
  return containsJsx(statement.expression);
}

function readonlyInlineProps(typeNode) {
  return (
    ts.isTypeReferenceNode(typeNode) &&
    ts.isIdentifier(typeNode.typeName) &&
    typeNode.typeName.text === "Readonly" &&
    typeNode.typeArguments?.length === 1 &&
    ts.isTypeLiteralNode(typeNode.typeArguments[0])
  );
}

function isReadonlyType(typeNode) {
  return (
    ts.isTypeReferenceNode(typeNode) &&
    ts.isIdentifier(typeNode.typeName) &&
    typeNode.typeName.text === "Readonly" &&
    typeNode.typeArguments?.length === 1
  );
}

function lineNumber(sourceFile, position) {
  return sourceFile.getLineAndCharacterOfPosition(position).line;
}

function finalJsxReturn(node) {
  if (!node.body || !ts.isBlock(node.body)) {
    return null;
  }
  const statement = node.body.statements.at(-1);
  return statement && returnsJsx(statement) ? statement : null;
}

function rendersJsx(node, finalReturn) {
  return (
    finalReturn !== null ||
    (node.body && !ts.isBlock(node.body) && ts.isExpression(node.body) && containsJsx(node.body))
  );
}

function addReturnSpacing({ component, finalReturn, lineEnding, problems, sourceFile, edits }) {
  if (!finalReturn || !ts.isBlock(component.body) || component.body.statements.length < 2) {
    return;
  }
  const previousStatement = component.body.statements.at(-2);
  const lineGap =
    lineNumber(sourceFile, finalReturn.getStart(sourceFile)) -
    lineNumber(sourceFile, previousStatement.end);
  if (lineGap >= 2) {
    return;
  }
  edits.push({ position: finalReturn.getStart(sourceFile), text: lineEnding });
  problems.push("add one blank line before the final JSX return (auto-fixable)");
}

function addPropsConvention({ component, name, problems, sourceFile, edits, typeAliases }) {
  const parameter = component.parameters[0];
  if (!parameter) {
    return;
  }

  const expectedTypeName = `${name}Props`;
  if (!parameter.type) {
    problems.push(
      `add an explicit ${expectedTypeName} annotation; the prop shape cannot be inferred safely`
    );
    return;
  }

  if (ts.isTypeLiteralNode(parameter.type) || readonlyInlineProps(parameter.type)) {
    const typeText = parameter.type.getText(sourceFile);
    const aliasType = readonlyInlineProps(parameter.type) ? typeText : `Readonly<${typeText}>`;
    edits.push({
      position: component.getStart(sourceFile),
      text: `type ${expectedTypeName} = ${aliasType};\n\n`,
    });
    edits.push({
      end: parameter.type.end,
      position: parameter.type.getStart(sourceFile),
      text: expectedTypeName,
    });
    problems.push(
      `extract inline props to type ${expectedTypeName} = Readonly<...> (auto-fixable)`
    );
    return;
  }

  if (!ts.isTypeReferenceNode(parameter.type) || !ts.isIdentifier(parameter.type.typeName)) {
    problems.push(`use a named props alias: type ${expectedTypeName} = Readonly<...>`);
    return;
  }

  const actualTypeName = parameter.type.typeName.text;
  if (actualTypeName !== expectedTypeName) {
    problems.push(`rename props type ${actualTypeName} to ${expectedTypeName}`);
    return;
  }

  const localAlias = typeAliases.get(expectedTypeName);
  if (localAlias && !isReadonlyType(localAlias.type)) {
    edits.push({ position: localAlias.type.getStart(sourceFile), text: "Readonly<" });
    edits.push({ position: localAlias.type.end, text: ">" });
    problems.push(`wrap ${expectedTypeName} in Readonly<...> (auto-fixable)`);
  }
}

function applyEdits(source, edits) {
  return edits
    .toSorted((left, right) => right.position - left.position)
    .reduce(
      (text, edit) =>
        text.slice(0, edit.position) + edit.text + text.slice(edit.end ?? edit.position),
      source
    );
}

function formatFile(filename) {
  const source = fs.readFileSync(filename, "utf8");
  const sourceFile = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const edits = [];
  const problems = [];
  const typeAliases = new Map(
    sourceFile.statements
      .filter(ts.isTypeAliasDeclaration)
      .map((declaration) => [declaration.name.text, declaration])
  );

  function visit(node) {
    const name = componentName(node);
    const finalReturn = name ? finalJsxReturn(node) : null;
    if (name && rendersJsx(node, finalReturn)) {
      const componentProblems = [];
      const context = {
        component: node,
        edits,
        finalReturn,
        lineEnding: source.includes("\r\n") ? "\r\n" : "\n",
        name,
        problems: componentProblems,
        sourceFile,
        typeAliases,
      };
      addReturnSpacing(context);
      addPropsConvention(context);
      problems.push(...componentProblems.map((problem) => `${name}: ${problem}`));
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (writeChanges && edits.length > 0) {
    fs.writeFileSync(filename, applyEdits(source, edits));
  }

  return problems.map((problem) => `${path.relative(projectDirectory, filename)}: ${problem}`);
}

const problems = findTsxFiles(sourceDirectory).flatMap(formatFile);

if (problems.length > 0 && !writeChanges) {
  console.error("React component conventions failed:");
  for (const problem of problems) {
    console.error(`- ${problem}`);
  }
  console.error(
    "Run `npm run format` to apply safe fixes; remaining items require an explicit prop type."
  );
  process.exitCode = 1;
} else if (writeChanges) {
  console.log(
    `React component formatting applied (${problems.length} change${problems.length === 1 ? "" : "s"}).`
  );
} else {
  console.log("React component formatting passed.");
}

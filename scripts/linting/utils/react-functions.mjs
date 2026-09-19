import { isIdentifier } from "./ast.mjs";

/**
 * Returns the locally declared name of a direct function declaration or
 * variable initializer. Wrapper calls are intentionally not unwrapped.
 *
 * @param {object} node
 * @returns {string | null}
 */
function functionName(node) {
  if (
    (node.type === "FunctionDeclaration" || node.type === "FunctionExpression") &&
    node.id?.type === "Identifier"
  ) {
    return node.id.name;
  }
  if (node.parent?.type === "VariableDeclarator" && node.parent.id.type === "Identifier") {
    return node.parent.id.name;
  }
  return null;
}

/**
 * Identifies convention-owned components and hooks by their local names.
 *
 * @param {object} node
 * @returns {boolean}
 */
function isReactFunction(node) {
  const name = functionName(node);
  return name !== null && (/^[A-Z]/.test(name) || /^use[A-Z0-9]/.test(name));
}

/**
 * Matches only inline function expressions passed directly to useEffect.
 *
 * @param {object} node
 * @returns {boolean}
 */
function isEffectCallback(node) {
  return (
    node.type === "FunctionExpression" &&
    node.parent?.type === "CallExpression" &&
    isIdentifier(node.parent.callee, "useEffect")
  );
}

/**
 * Checks the expression forms that can directly contribute JSX to a rendered
 * value without recursively reflecting over arbitrary AST properties.
 *
 * @param {object | null | undefined} node
 * @returns {boolean}
 */
function containsRenderedJsx(node) {
  if (!node) {
    return false;
  }
  if (node.type === "JSXElement" || node.type === "JSXFragment") {
    return true;
  }
  if (node.type === "ConditionalExpression") {
    return containsRenderedJsx(node.consequent) || containsRenderedJsx(node.alternate);
  }
  if (node.type === "LogicalExpression") {
    return containsRenderedJsx(node.left) || containsRenderedJsx(node.right);
  }
  if (
    [
      "TSAsExpression",
      "TSSatisfiesExpression",
      "TSNonNullExpression",
      "ParenthesizedExpression",
    ].includes(node.type)
  ) {
    return containsRenderedJsx(node.expression);
  }
  return false;
}

/**
 * Finds the nearest function owner and determines whether it is a named
 * component, stopping at that first function to avoid leaking across scopes.
 *
 * @param {object} node
 * @returns {boolean}
 */
function isInsideComponent(node) {
  for (let owner = node.parent; owner; owner = owner.parent) {
    if (
      ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(owner.type)
    ) {
      const name = functionName(owner);
      return name !== null && /^[A-Z]/.test(name);
    }
  }
  return false;
}

export { containsRenderedJsx, functionName, isEffectCallback, isInsideComponent, isReactFunction };

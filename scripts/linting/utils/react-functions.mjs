/**
 * Returns the locally declared name of a direct function declaration or
 * variable initializer.
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

export { functionName };

/**
 * Resolves the filename across the ESLint and Oxlint context APIs.
 *
 * @param {object} context
 * @returns {string}
 */
function contextFilename(context) {
  return typeof context.getFilename === "function" ? context.getFilename() : context.filename;
}

/**
 * @param {object | null | undefined} node
 * @param {string} name
 * @returns {boolean}
 */
function isIdentifier(node, name) {
  return node?.type === "Identifier" && node.name === name;
}

/**
 * Returns a non-computed member's property name. Computed access is excluded
 * because these convention rules intentionally match statically known APIs.
 *
 * @param {object | null | undefined} node
 * @returns {string | null}
 */
function memberName(node) {
  return node?.type === "MemberExpression" && !node.computed && node.property.type === "Identifier"
    ? node.property.name
    : null;
}

export { contextFilename, isIdentifier, memberName };

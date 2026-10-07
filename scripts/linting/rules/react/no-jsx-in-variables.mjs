const FunctionTypes = new Set([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
]);

/**
 * Finds JSX that a value evaluates to, looking through the expression forms
 * used to choose markup: parentheses, type assertions, ternaries, and logical
 * operators. Functions are boundaries: a render function is not stored JSX.
 *
 * @param {object | null | undefined} node
 * @returns {object | null}
 */
function storedJsx(node) {
  switch (node?.type) {
    case "JSXElement":
    case "JSXFragment":
      return node;
    case "ParenthesizedExpression":
    case "TSAsExpression":
    case "TSSatisfiesExpression":
    case "TSNonNullExpression":
      return storedJsx(node.expression);
    case "ConditionalExpression":
      return storedJsx(node.consequent) ?? storedJsx(node.alternate);
    case "LogicalExpression":
      return storedJsx(node.right) ?? storedJsx(node.left);
    default:
      return null;
  }
}

/**
 * Module-level constants are shared values, not markup staged inside a render.
 *
 * @param {object} node
 * @returns {boolean}
 */
function isInsideFunction(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (FunctionTypes.has(current.type)) {
      return true;
    }
  }
  return false;
}

export default {
  meta: {
    type: "suggestion",
    schema: [],
    messages: {
      storedJsx:
        "Keep JSX in the returned tree. Derive data above the return, or extract a named component for a substantial branch.",
    },
  },
  create(context) {
    function check(value, node) {
      const jsx = storedJsx(value);
      if (jsx && isInsideFunction(node)) {
        context.report({ messageId: "storedJsx", node: jsx });
      }
    }

    return {
      VariableDeclarator(node) {
        check(node.init, node);
      },
      AssignmentExpression(node) {
        if (node.left.type === "Identifier") {
          check(node.right, node);
        }
      },
    };
  },
};

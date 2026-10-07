const FunctionTypes = new Set([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
]);

export default {
  meta: {
    type: "suggestion",
    schema: [],
    messages: {
      awaitInTernary:
        "Don't bury await inside a ternary. Use an if statement or an early return so each async branch is explicit.",
    },
  },
  create(context) {
    return {
      AwaitExpression(node) {
        // Walk up to the nearest function; an await inside a nested callback
        // belongs to that callback, not to an enclosing ternary.
        for (let current = node.parent; current; current = current.parent) {
          if (FunctionTypes.has(current.type)) {
            return;
          }
          if (current.type === "ConditionalExpression") {
            context.report({ messageId: "awaitInTernary", node });
            return;
          }
        }
      },
    };
  },
};

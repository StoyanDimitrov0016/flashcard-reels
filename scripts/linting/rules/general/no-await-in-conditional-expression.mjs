export default {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      forbidden:
        "Do not await inside a conditional expression; use an explicit branch so asynchronous control flow is visible.",
    },
  },
  create(context) {
    return {
      AwaitExpression(node) {
        let parent = node.parent;
        while (parent) {
          if (
            parent.type === "ArrowFunctionExpression" ||
            parent.type === "FunctionExpression" ||
            parent.type === "FunctionDeclaration"
          ) {
            return;
          }
          if (parent.type === "ConditionalExpression") {
            context.report({ messageId: "forbidden", node });
            return;
          }
          parent = parent.parent;
        }
      },
    };
  },
};

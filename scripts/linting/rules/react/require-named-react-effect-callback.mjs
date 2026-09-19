import { isIdentifier } from "../../utils/ast.mjs";

export default {
  meta: {
    type: "problem",
    schema: [],
    messages: { forbidden: "useEffect callbacks must be inline named function expressions." },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isIdentifier(node.callee, "useEffect")) {
          return;
        }
        const callback = node.arguments[0];
        if (!callback || callback.type !== "FunctionExpression" || callback.id === null) {
          context.report({ messageId: "forbidden", node: callback ?? node });
        }
      },
    };
  },
};

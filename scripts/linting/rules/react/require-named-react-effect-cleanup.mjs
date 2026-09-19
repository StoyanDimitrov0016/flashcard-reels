import { isEffectCallback } from "../../utils/react-functions.mjs";

export default {
  meta: {
    type: "problem",
    schema: [],
    messages: { forbidden: "Direct useEffect cleanup functions must be inline and named." },
  },
  create(context) {
    return {
      ReturnStatement(node) {
        let owner = node.parent;
        while (owner && !isEffectCallback(owner)) {
          if (
            owner.type === "ArrowFunctionExpression" ||
            owner.type === "FunctionExpression" ||
            owner.type === "FunctionDeclaration"
          ) {
            return;
          }
          owner = owner.parent;
        }
        if (
          owner &&
          node.argument &&
          (node.argument.type === "ArrowFunctionExpression" ||
            (node.argument.type === "FunctionExpression" && node.argument.id === null))
        ) {
          context.report({ messageId: "forbidden", node: node.argument });
        }
      },
    };
  },
};

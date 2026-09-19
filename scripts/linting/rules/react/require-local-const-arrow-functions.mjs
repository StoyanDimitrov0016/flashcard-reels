import { isEffectCallback, isReactFunction } from "../../utils/react-functions.mjs";

export default {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      forbidden: "Functions local to React components and hooks must use const arrow syntax.",
    },
  },
  create(context) {
    return {
      FunctionDeclaration(node) {
        if (node.parent?.type !== "BlockStatement") {
          return;
        }
        const owner = node.parent.parent;
        if (owner && (isReactFunction(owner) || isEffectCallback(owner))) {
          context.report({ messageId: "forbidden", node });
        }
      },
    };
  },
};

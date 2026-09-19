import { contextFilename } from "../../utils/ast.mjs";

const domainPath = /[\\/]features[\\/][^\\/]+[\\/]domain[\\/]/;

export default {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      forbidden: "Domain code must not import Zod; validate serialized boundaries in contracts.",
    },
  },
  create(context) {
    if (!domainPath.test(contextFilename(context))) {
      return {};
    }
    return {
      ImportDeclaration(node) {
        if (node.source.value === "zod") {
          context.report({ messageId: "forbidden", node });
        }
      },
    };
  },
};

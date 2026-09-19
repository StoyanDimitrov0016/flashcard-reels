import { containsRenderedJsx } from "../../utils/react-functions.mjs";

function isNull(branch) {
  return branch.type === "Literal" && branch.value === null;
}

export default {
  meta: {
    type: "suggestion",
    schema: [],
    messages: {
      forbidden:
        "For JSX rendered on only one branch, use && with a boolean condition. Keep ternaries for two meaningful alternatives.",
    },
  },
  create(context) {
    return {
      ConditionalExpression(node) {
        // Render-slot props and non-JSX values retain their distinct null semantics.
        if (
          node.parent?.type !== "JSXExpressionContainer" ||
          node.parent.parent?.type === "JSXAttribute"
        ) {
          return;
        }
        if (
          (isNull(node.alternate) && containsRenderedJsx(node.consequent)) ||
          (isNull(node.consequent) && containsRenderedJsx(node.alternate))
        ) {
          context.report({ messageId: "forbidden", node });
        }
      },
    };
  },
};

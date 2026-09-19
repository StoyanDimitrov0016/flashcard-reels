import { containsRenderedJsx, isInsideComponent } from "../../utils/react-functions.mjs";

export default {
  meta: {
    type: "suggestion",
    schema: [],
    messages: {
      forbidden:
        "Keep JSX in the returned tree or a named child component; derive data and conditions above the return.",
    },
  },
  create(context) {
    return {
      VariableDeclarator(node) {
        if (isInsideComponent(node) && containsRenderedJsx(node.init)) {
          context.report({ messageId: "forbidden", node });
        }
      },
      AssignmentExpression(node) {
        if (isInsideComponent(node) && containsRenderedJsx(node.right)) {
          context.report({ messageId: "forbidden", node });
        }
      },
    };
  },
};

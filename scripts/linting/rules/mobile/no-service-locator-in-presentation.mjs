import { contextFilename, isIdentifier } from "../../utils/ast.mjs";

const presentationPath =
  /[\\/]features[\\/][^\\/]+[\\/]presentation[\\/]|[\\/]app[\\/].+\.(ts|tsx)$/;
const rootCompositionPath = /(?:^|[\\/])src[\\/]app[\\/]_layout\.tsx$/;
const presentationHookPath = /[\\/]features[\\/][^\\/]+[\\/]presentation[\\/]hooks[\\/]/;

function isPresentation(filename) {
  return presentationPath.test(filename) && !rootCompositionPath.test(filename);
}

export default {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      forbidden:
        "Presentation code must use a purpose-built controller hook, not the global service locator.",
    },
  },
  create(context) {
    const filename = contextFilename(context);
    if (!isPresentation(filename) || presentationHookPath.test(filename)) {
      return {};
    }
    return {
      ImportDeclaration(node) {
        if (node.source.value === "@/infrastructure/app-services") {
          context.report({ messageId: "forbidden", node });
        }
      },
      CallExpression(node) {
        if (isIdentifier(node.callee, "useAppServices")) {
          context.report({ messageId: "forbidden", node });
        }
      },
    };
  },
};

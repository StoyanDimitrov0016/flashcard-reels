import { contextFilename } from "../../utils/ast.mjs";

const presentationPath =
  /[\\/]features[\\/][^\\/]+[\\/]presentation[\\/]|[\\/]app[\\/].+\.(ts|tsx)$/;

export default {
  meta: {
    type: "problem",
    schema: [],
    messages: { forbidden: "Presentation code must not consume engine policy directly." },
  },
  create(context) {
    if (!presentationPath.test(contextFilename(context))) {
      return {};
    }
    return {
      ImportDeclaration(node) {
        if (
          node.source.value === "@/features/reels/domain/feed-engine" &&
          node.specifiers.some(
            (specifier) => specifier.imported && specifier.imported.name === "FEED_ENGINE_CONFIG"
          )
        ) {
          context.report({ messageId: "forbidden", node });
        }
      },
    };
  },
};

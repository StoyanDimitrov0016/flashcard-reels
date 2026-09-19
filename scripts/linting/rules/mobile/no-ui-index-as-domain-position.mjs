import { contextFilename, memberName } from "../../utils/ast.mjs";

const reelPresentationPath = /[\\/]features[\\/]reels[\\/]presentation[\\/]components[\\/]/;
const domainPositionMethods = new Set([
  "startAttempt",
  "finalizeAttempt",
  "rateAttempt",
  "consumeRecurrence",
  "updateCurrentReelPosition",
  "updateSessionReelPosition",
]);
const localIndexNames = new Set(["index", "activeIndex", "itemIndex", "localIndex"]);

export default {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      forbidden:
        "Pass the occurrences absolute reelPosition, not a presentation-local index, to domain APIs.",
    },
  },
  create(context) {
    if (!reelPresentationPath.test(contextFilename(context))) {
      return {};
    }
    return {
      CallExpression(node) {
        if (!domainPositionMethods.has(memberName(node.callee))) {
          return;
        }
        if (node.arguments.some((argument) => localIndexNames.has(argument.name))) {
          context.report({ messageId: "forbidden", node });
        }
      },
    };
  },
};

import { contextFilename, isIdentifier, memberName } from "../../utils/ast.mjs";

const presentationPath =
  /[\\/]features[\\/][^\\/]+[\\/]presentation[\\/]|[\\/]app[\\/].+\.(ts|tsx)$/;
const persistenceMethods = new Set([
  "startAttempt",
  "finalizeAttempt",
  "rateAttempt",
  "consumeRecurrence",
  "updateCurrentReelPosition",
  "updateSessionReelPosition",
  "extendFeed",
]);

/**
 * Searches one effect callback subtree for the first persistence orchestration
 * call. Metadata and parent links are skipped to keep traversal acyclic.
 *
 * @param {object | null | undefined} node
 * @returns {object | null}
 */
function findPersistenceCall(node) {
  if (!node || typeof node !== "object") {
    return null;
  }
  if (node.type === "CallExpression" && persistenceMethods.has(memberName(node.callee))) {
    return node;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === "loc" || key === "range" || key === "parent" || key === "tokens") {
      continue;
    }
    if (Array.isArray(value)) {
      for (const child of value) {
        const found = findPersistenceCall(child);
        if (found) {
          return found;
        }
      }
    } else {
      const found = findPersistenceCall(value);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

export default {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      forbidden:
        "React effects must call a semantic controller action, not persistence orchestration directly.",
    },
  },
  create(context) {
    if (!presentationPath.test(contextFilename(context))) {
      return {};
    }
    return {
      CallExpression(node) {
        if (
          isIdentifier(node.callee, "useEffect") ||
          isIdentifier(node.callee, "useLayoutEffect")
        ) {
          const offendingCall = findPersistenceCall(node.arguments[0]);
          if (offendingCall) {
            context.report({ messageId: "forbidden", node: offendingCall });
          }
        }
      },
    };
  },
};

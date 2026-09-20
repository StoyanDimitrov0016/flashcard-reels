const FEATURE_ROOT_IMPORT = /^@\/features\/[^/]+\/?$/;

/**
 * Feature-root barrels can mix layers and erase the dependency direction that
 * the architecture rule needs to verify. Require callers to name the target
 * layer explicitly instead.
 */
export default {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      ambiguous:
        "Feature-root barrels mix responsibilities; import an explicit domain, application, infrastructure, or presentation path.",
    },
  },
  create(context) {
    function check(node, value) {
      if (typeof value === "string" && FEATURE_ROOT_IMPORT.test(value)) {
        context.report({ messageId: "ambiguous", node });
      }
    }

    return {
      ImportDeclaration(node) {
        check(node, node.source.value);
      },
      ExportNamedDeclaration(node) {
        if (node.source) {
          check(node, node.source.value);
        }
      },
      ExportAllDeclaration(node) {
        check(node, node.source.value);
      },
      ImportExpression(node) {
        if (node.source.type === "Literal") {
          check(node, node.source.value);
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          node.arguments.length === 1 &&
          node.arguments[0]?.type === "Literal"
        ) {
          check(node, node.arguments[0].value);
        }
      },
    };
  },
};

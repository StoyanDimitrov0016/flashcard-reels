const presentationPath =
  /[\\/]features[\\/][^\\/]+[\\/]presentation[\\/]|[\\/]app[\\/].+\.(ts|tsx)$/;
const rootCompositionPath = /(?:^|[\\/])src[\\/]app[\\/]_layout\.tsx$/;
const presentationHookPath = /[\\/]features[\\/][^\\/]+[\\/]presentation[\\/]hooks[\\/]/;
const reelPresentationPath = /[\\/]features[\\/]reels[\\/]presentation[\\/]components[\\/]/;
const domainPath = /[\\/]features[\\/][^\\/]+[\\/]domain[\\/]/;
const persistenceMethods = new Set([
  "startAttempt",
  "finalizeAttempt",
  "rateAttempt",
  "consumeRecurrence",
  "updateCurrentReelPosition",
  "updateSessionReelPosition",
  "extendFeed",
]);
const domainPositionMethods = new Set([
  "startAttempt",
  "finalizeAttempt",
  "rateAttempt",
  "consumeRecurrence",
  "updateCurrentReelPosition",
  "updateSessionReelPosition",
]);
const localIndexNames = new Set(["index", "activeIndex", "itemIndex", "localIndex"]);

function isPresentation(filename) {
  return presentationPath.test(filename) && !rootCompositionPath.test(filename);
}

function isPresentationHook(filename) {
  return presentationHookPath.test(filename);
}

function contextFilename(context) {
  return typeof context.getFilename === "function" ? context.getFilename() : context.filename;
}

function isIdentifier(node, name) {
  return node && node.type === "Identifier" && node.name === name;
}

function memberName(node) {
  return node &&
    node.type === "MemberExpression" &&
    !node.computed &&
    node.property.type === "Identifier"
    ? node.property.name
    : null;
}

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

const noServiceLocatorInPresentation = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      forbidden:
        "Presentation code must use a purpose-built controller hook, not the global service locator.",
    },
  },
  create(context) {
    if (!isPresentation(contextFilename(context)) || isPresentationHook(contextFilename(context))) {
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

const noEnginePolicyInPresentation = {
  meta: {
    type: "problem",
    schema: [],
    messages: { forbidden: "Presentation code must not consume engine policy directly." },
  },
  create(context) {
    if (!isPresentation(contextFilename(context))) {
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

const noZodInDomain = {
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

const noPersistenceOrchestrationInReactEffect = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      forbidden:
        "React effects must call a semantic controller action, not persistence orchestration directly.",
    },
  },
  create(context) {
    if (!isPresentation(contextFilename(context))) {
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

const noUiIndexAsDomainPosition = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      forbidden:
        "Pass the occurrence’s absolute reelPosition, not a presentation-local index, to domain APIs.",
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

module.exports = {
  meta: { name: "flashcards" },
  rules: {
    "no-service-locator-in-presentation": noServiceLocatorInPresentation,
    "no-engine-policy-in-presentation": noEnginePolicyInPresentation,
    "no-persistence-orchestration-in-react-effect": noPersistenceOrchestrationInReactEffect,
    "no-ui-index-as-domain-position": noUiIndexAsDomainPosition,
    "no-zod-in-domain": noZodInDomain,
  },
};

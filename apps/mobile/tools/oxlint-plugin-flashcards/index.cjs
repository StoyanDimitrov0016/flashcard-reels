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

function functionName(node) {
  if (
    (node.type === "FunctionDeclaration" || node.type === "FunctionExpression") &&
    node.id?.type === "Identifier"
  ) {
    return node.id.name;
  }
  if (node.parent?.type === "VariableDeclarator" && node.parent.id.type === "Identifier") {
    return node.parent.id.name;
  }
  return null;
}

function isReactFunction(node) {
  const name = functionName(node);
  return name !== null && (/^[A-Z]/.test(name) || /^use[A-Z0-9]/.test(name));
}

function isEffectCallback(node) {
  return (
    node.type === "FunctionExpression" &&
    node.parent?.type === "CallExpression" &&
    isIdentifier(node.parent.callee, "useEffect")
  );
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

const requireNamedReactEffectCallback = {
  meta: {
    type: "problem",
    schema: [],
    messages: { forbidden: "useEffect callbacks must be inline named function expressions." },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isIdentifier(node.callee, "useEffect")) {
          return;
        }
        const callback = node.arguments[0];
        if (!callback || callback.type !== "FunctionExpression" || callback.id === null) {
          context.report({ messageId: "forbidden", node: callback ?? node });
        }
      },
    };
  },
};

const requireNamedReactEffectCleanup = {
  meta: {
    type: "problem",
    schema: [],
    messages: { forbidden: "Direct useEffect cleanup functions must be inline and named." },
  },
  create(context) {
    return {
      ReturnStatement(node) {
        let owner = node.parent;
        while (owner && !isEffectCallback(owner)) {
          if (
            owner.type === "ArrowFunctionExpression" ||
            owner.type === "FunctionExpression" ||
            owner.type === "FunctionDeclaration"
          ) {
            return;
          }
          owner = owner.parent;
        }
        if (
          owner &&
          node.argument &&
          (node.argument.type === "ArrowFunctionExpression" ||
            (node.argument.type === "FunctionExpression" && node.argument.id === null))
        ) {
          context.report({ messageId: "forbidden", node: node.argument });
        }
      },
    };
  },
};

const noAwaitInConditionalExpression = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      forbidden:
        "Do not await inside a conditional expression; use an explicit branch so asynchronous control flow is visible.",
    },
  },
  create(context) {
    return {
      AwaitExpression(node) {
        let parent = node.parent;
        while (parent) {
          if (
            parent.type === "ArrowFunctionExpression" ||
            parent.type === "FunctionExpression" ||
            parent.type === "FunctionDeclaration"
          ) {
            return;
          }
          if (parent.type === "ConditionalExpression") {
            context.report({ messageId: "forbidden", node });
            return;
          }
          parent = parent.parent;
        }
      },
    };
  },
};

const requireLocalConstArrowFunctions = {
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

function containsRenderedJsx(node) {
  if (!node) {
    return false;
  }
  if (node.type === "JSXElement" || node.type === "JSXFragment") {
    return true;
  }
  if (node.type === "ConditionalExpression") {
    return containsRenderedJsx(node.consequent) || containsRenderedJsx(node.alternate);
  }
  if (node.type === "LogicalExpression") {
    return containsRenderedJsx(node.left) || containsRenderedJsx(node.right);
  }
  if (
    [
      "TSAsExpression",
      "TSSatisfiesExpression",
      "TSNonNullExpression",
      "ParenthesizedExpression",
    ].includes(node.type)
  ) {
    return containsRenderedJsx(node.expression);
  }
  return false;
}

function isInsideComponent(node) {
  for (let owner = node.parent; owner; owner = owner.parent) {
    if (
      ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(owner.type)
    ) {
      const name = functionName(owner);
      return name !== null && /^[A-Z]/.test(name);
    }
  }
  return false;
}

const noLocalJsxVariables = {
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

function isNull(branch) {
  return branch.type === "Literal" && branch.value === null;
}

const preferJsxAnd = {
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

module.exports = {
  meta: { name: "flashcards" },
  rules: {
    "no-service-locator-in-presentation": noServiceLocatorInPresentation,
    "no-engine-policy-in-presentation": noEnginePolicyInPresentation,
    "no-persistence-orchestration-in-react-effect": noPersistenceOrchestrationInReactEffect,
    "no-ui-index-as-domain-position": noUiIndexAsDomainPosition,
    "no-zod-in-domain": noZodInDomain,
    "require-local-const-arrow-functions": requireLocalConstArrowFunctions,
    "require-named-react-effect-callback": requireNamedReactEffectCallback,
    "require-named-react-effect-cleanup": requireNamedReactEffectCleanup,
    "no-await-in-conditional-expression": noAwaitInConditionalExpression,
    "no-local-jsx-variables": noLocalJsxVariables,
    "prefer-jsx-and": preferJsxAnd,
  },
};

const EffectHookNames = new Set(["useEffect", "useLayoutEffect", "useInsertionEffect"]);

/**
 * Returns the hook name for `useEffect(...)` and `React.useEffect(...)` calls.
 *
 * @param {object} callee
 * @returns {string | null}
 */
function effectHookName(callee) {
  if (callee.type === "Identifier") {
    return EffectHookNames.has(callee.name) ? callee.name : null;
  }
  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier" &&
    EffectHookNames.has(callee.property.name)
  ) {
    return callee.property.name;
  }
  return null;
}

/**
 * Inline cleanups are anonymous functions returned directly from the effect.
 * Returning an existing identifier already names the cleanup.
 *
 * @param {object | null | undefined} node
 * @returns {boolean}
 */
function isAnonymousFunction(node) {
  return (
    node?.type === "ArrowFunctionExpression" ||
    (node?.type === "FunctionExpression" && node.id === null)
  );
}

export default {
  meta: {
    type: "suggestion",
    schema: [],
    messages: {
      anonymousEffect:
        "Pass {{hook}} a named function expression that says why the effect exists, e.g. function synchronizePreferences() { ... }.",
      anonymousCleanup:
        "Name the cleanup returned from {{hook}}, e.g. return function unsubscribeFromChanges() { ... }.",
    },
  },
  create(context) {
    /** @type {{ effect: object, hook: string }[]} Active named effect callbacks. */
    const effects = [];
    /** @type {object[]} Every active function, so returns are attributed to their owner. */
    const functionStack = [];

    function enterFunction(node) {
      functionStack.push(node);
    }

    function exitFunction(node) {
      if (functionStack.at(-1) === node) {
        functionStack.pop();
      }
      if (effects.at(-1)?.effect === node) {
        effects.pop();
      }
    }

    return {
      CallExpression(node) {
        const hook = effectHookName(node.callee);
        const [callback] = node.arguments;
        if (hook === null || !callback) {
          return;
        }
        if (isAnonymousFunction(callback)) {
          context.report({ data: { hook }, messageId: "anonymousEffect", node: callback });
          return;
        }
        if (callback.type === "FunctionExpression") {
          effects.push({ effect: callback, hook });
        }
      },
      ReturnStatement(node) {
        const current = effects.at(-1);
        if (
          current &&
          functionStack.at(-1) === current.effect &&
          isAnonymousFunction(node.argument)
        ) {
          context.report({
            data: { hook: current.hook },
            messageId: "anonymousCleanup",
            node: node.argument,
          });
        }
      },
      FunctionDeclaration: enterFunction,
      "FunctionDeclaration:exit": exitFunction,
      FunctionExpression: enterFunction,
      "FunctionExpression:exit": exitFunction,
      ArrowFunctionExpression: enterFunction,
      "ArrowFunctionExpression:exit": exitFunction,
    };
  },
};

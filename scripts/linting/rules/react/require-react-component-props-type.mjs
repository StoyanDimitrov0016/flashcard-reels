import { functionName } from "../../utils/react-functions.mjs";

/**
 * Returns the statement that owns a component declaration.
 * Direct, exported function declarations and direct variable initializers are
 * deliberately supported; this keeps adjacency lookup bounded and predictable.
 *
 * @param {object} node FunctionDeclaration, FunctionExpression, or ArrowFunctionExpression.
 * @returns {object | null}
 */
function componentStatement(node) {
  let statement = node;
  if (node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") {
    if (node.parent?.type !== "VariableDeclarator") {
      return null;
    }
    statement = node.parent.parent;
  }
  if (
    statement?.parent?.type === "ExportNamedDeclaration" ||
    statement?.parent?.type === "ExportDefaultDeclaration"
  ) {
    statement = statement.parent;
  }
  return statement ?? null;
}

/**
 * Unwraps an exported declaration while preserving the statement used for
 * immediate-predecessor lookup.
 *
 * @param {object | null} statement
 * @returns {object | null}
 */
function declarationFromStatement(statement) {
  if (
    statement?.type === "ExportNamedDeclaration" ||
    statement?.type === "ExportDefaultDeclaration"
  ) {
    return statement.declaration ?? null;
  }
  return statement;
}

/**
 * Gets the TypeScript annotation attached to a props binding.
 *
 * @param {object} parameter
 * @returns {object | null}
 */
function parameterType(parameter) {
  const binding = parameter.type === "AssignmentPattern" ? parameter.left : parameter;
  return binding.typeAnnotation?.typeAnnotation ?? null;
}

/**
 * Checks for the exact outer Readonly<T> wrapper. The inner type remains
 * unrestricted because this rule owns mutability and naming, not prop shape.
 *
 * @param {object} type
 * @returns {boolean}
 */
function isReadonlyTypeReference(type) {
  if (
    type?.type !== "TSTypeReference" ||
    type.typeName?.type !== "Identifier" ||
    type.typeName.name !== "Readonly"
  ) {
    return false;
  }
  const argumentsNode = type.typeArguments ?? type.typeParameters;
  return argumentsNode?.params?.length === 1;
}

export default {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      missingAnnotation: "React component props must have an explicit {{expectedName}} annotation.",
      namedAlias:
        "React component props must use a named local type alias {{expectedName}} immediately above the component.",
      wrongTypeName: "React component props type must be named {{expectedName}}.",
      adjacentAlias:
        "Declare local type alias {{expectedName}} immediately above the React component.",
      mutableAlias: "Wrap {{expectedName}} in Readonly<...>.",
    },
  },
  create(context) {
    /** @type {Map<object, string>} Component functions collected for one deferred O(n) report pass. */
    const components = new Map();
    /** @type {Set<object>} Functions proven to return JSX during the single AST traversal. */
    const jsxReturningFunctions = new Set();
    /** @type {Map<object, object | null>} O(1) predecessor lookup for Program and block statements. */
    const previousStatements = new Map();
    /** @type {object[]} Active functions, used to assign returns and JSX without subtree rescans. */
    const functionStack = [];
    /** @type {(object | null)[]} Function owning each active ReturnStatement. */
    const returnOwners = [];

    /**
     * Indexes sibling statements once. Components later perform an O(1)
     * adjacency lookup rather than scanning their containing body.
     *
     * @param {object[]} statements
     */
    function indexStatements(statements) {
      let previous = null;
      for (const statement of statements) {
        previousStatements.set(statement, previous);
        previous = statement;
      }
    }

    /**
     * Tracks a directly declared uppercase-named function as a possible
     * component. JSX return evidence is collected independently.
     *
     * @param {object} node
     */
    function enterFunction(node) {
      functionStack.push(node);
      const name = functionName(node);
      if (name !== null && /^[A-Z]/.test(name) && componentStatement(node)) {
        components.set(node, name);
      }
    }

    function exitFunction(node) {
      if (functionStack.at(-1) === node) {
        functionStack.pop();
      }
    }

    /**
     * Attributes JSX only to a function that directly returns it. Tracking the
     * active return owner prevents JSX inside nested local functions from
     * making the enclosing uppercase function look like a component.
     */
    function markReturnedJsx() {
      const owner = functionStack.at(-1);
      if (!owner) {
        return;
      }
      if (owner.type === "ArrowFunctionExpression" && owner.body.type !== "BlockStatement") {
        jsxReturningFunctions.add(owner);
        return;
      }
      if (returnOwners.at(-1) === owner) {
        jsxReturningFunctions.add(owner);
      }
    }

    /**
     * Validates each collected component once after traversal, when JSX-return
     * evidence and statement predecessor indexes are complete.
     */
    function reportComponents() {
      for (const [component, name] of components) {
        if (!jsxReturningFunctions.has(component) || component.params.length === 0) {
          continue;
        }

        const expectedName = `${name}Props`;
        const annotation = parameterType(component.params[0]);
        if (!annotation) {
          context.report({
            data: { expectedName },
            messageId: "missingAnnotation",
            node: component.params[0],
          });
          continue;
        }
        if (annotation.type !== "TSTypeReference" || annotation.typeName?.type !== "Identifier") {
          context.report({ data: { expectedName }, messageId: "namedAlias", node: annotation });
          continue;
        }
        if (annotation.typeName.name !== expectedName) {
          context.report({
            data: { expectedName },
            messageId: annotation.typeName.name === "Readonly" ? "namedAlias" : "wrongTypeName",
            node: annotation,
          });
          continue;
        }

        const statement = componentStatement(component);
        const alias = declarationFromStatement(previousStatements.get(statement));
        if (
          alias?.type !== "TSTypeAliasDeclaration" ||
          alias.id?.type !== "Identifier" ||
          alias.id.name !== expectedName
        ) {
          context.report({ data: { expectedName }, messageId: "adjacentAlias", node: annotation });
          continue;
        }
        if (!isReadonlyTypeReference(alias.typeAnnotation)) {
          context.report({
            data: { expectedName },
            messageId: "mutableAlias",
            node: alias.typeAnnotation,
          });
        }
      }
    }

    return {
      Program(node) {
        indexStatements(node.body);
      },
      "Program:exit": reportComponents,
      BlockStatement(node) {
        indexStatements(node.body);
      },
      FunctionDeclaration: enterFunction,
      "FunctionDeclaration:exit": exitFunction,
      FunctionExpression: enterFunction,
      "FunctionExpression:exit": exitFunction,
      ArrowFunctionExpression: enterFunction,
      "ArrowFunctionExpression:exit": exitFunction,
      ReturnStatement() {
        returnOwners.push(functionStack.at(-1) ?? null);
      },
      "ReturnStatement:exit"() {
        returnOwners.pop();
      },
      JSXElement: markReturnedJsx,
      JSXFragment: markReturnedJsx,
    };
  },
};

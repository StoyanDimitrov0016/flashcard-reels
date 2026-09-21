import { functionName } from "../../utils/react-functions.mjs";

function hookStatement(node) {
  if (node.parent?.type === "ExportNamedDeclaration") {
    return node.parent;
  }
  return node;
}

function declarationFromStatement(statement) {
  if (statement?.type === "ExportNamedDeclaration") {
    return statement.declaration ?? null;
  }
  return statement;
}

function parameterType(parameter) {
  return parameter.typeAnnotation?.typeAnnotation ?? null;
}

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
      missingAnnotation: "Custom hook object parameters must use {{expectedName}}.",
      namedAlias: "Custom hook object parameters must use the named local type {{expectedName}}.",
      wrongTypeName: "Custom hook options type must be named {{expectedName}}.",
      adjacentAlias: "Declare local type alias {{expectedName}} immediately above the custom hook.",
      mutableAlias: "Wrap {{expectedName}} in Readonly<...>.",
    },
  },
  create(context) {
    const previousStatements = new Map();

    function indexStatements(statements) {
      let previous = null;
      for (const statement of statements) {
        previousStatements.set(statement, previous);
        previous = statement;
      }
    }

    function checkHook(node) {
      const name = functionName(node);
      if (name === null || !/^use[A-Z0-9]/.test(name) || node.params.length === 0) {
        return;
      }
      const parameter = node.params[0];
      if (parameter.type !== "ObjectPattern") {
        return;
      }

      const expectedName = `${name.slice(3)}Options`;
      const annotation = parameterType(parameter);
      if (!annotation) {
        context.report({ data: { expectedName }, messageId: "missingAnnotation", node: parameter });
        return;
      }
      if (annotation.type !== "TSTypeReference" || annotation.typeName?.type !== "Identifier") {
        context.report({ data: { expectedName }, messageId: "namedAlias", node: annotation });
        return;
      }
      if (annotation.typeName.name !== expectedName) {
        context.report({
          data: { expectedName },
          messageId: "wrongTypeName",
          node: annotation,
        });
        return;
      }

      const statement = hookStatement(node);
      const alias = declarationFromStatement(previousStatements.get(statement));
      if (
        alias?.type !== "TSTypeAliasDeclaration" ||
        alias.id?.type !== "Identifier" ||
        alias.id.name !== expectedName
      ) {
        context.report({ data: { expectedName }, messageId: "adjacentAlias", node: annotation });
        return;
      }
      if (!isReadonlyTypeReference(alias.typeAnnotation)) {
        context.report({
          data: { expectedName },
          messageId: "mutableAlias",
          node: alias.typeAnnotation,
        });
      }
    }

    return {
      Program(node) {
        indexStatements(node.body);
      },
      BlockStatement(node) {
        indexStatements(node.body);
      },
      FunctionDeclaration: checkHook,
    };
  },
};

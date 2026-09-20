import path from "node:path";

import { contextFilename } from "../../utils/ast.mjs";

const FEATURE_IMPORT = /^@\/features\/([^/]+)\/([^/]+)(?:\/|$)/;
const FEATURE_FILE = /(?:^|\/)src\/features\/([^/]+)\/([^/]+)(?:\/|$)/;
const SHARED_IMPORT = /^@\/shared\/(domain|application|infrastructure|presentation)(?:\/|$)/;
const SHARED_FILE = /(?:^|\/)src\/shared\/(domain|application|infrastructure|presentation)(?:\/|$)/;
const SHARED_SOURCE = /(?:^|\/)src\/shared(?:\/|$)/;
const ROOT_COMPOSITION_FILE = /(?:^|\/)src\/app\/_layout\.tsx$/;
const APP_ROUTE_FILE = /(?:^|\/)src\/app\/.+\.(?:ts|tsx)$/;
const ROOT_INFRASTRUCTURE_FILE = /(?:^|\/)src\/infrastructure(?:\/|$)/;
const APP_SERVICES_IMPORT = "@/infrastructure/app-services";

/**
 * Classifies a mobile source file once so every module-edge check is constant
 * time. Unknown folders remain unclassified instead of receiving permissions
 * through a best-effort guess.
 *
 * @param {string} filename
 * @returns {{ feature: string | null, layer: string | null, presentationPart: string | null, rootComposition: boolean, shared: boolean }}
 */
function classifyFile(filename) {
  const normalized = filename.replaceAll("\\", "/");
  const rootComposition = ROOT_COMPOSITION_FILE.test(normalized);
  const featureMatch = normalized.match(FEATURE_FILE);
  const sharedMatch = normalized.match(SHARED_FILE);
  const shared = SHARED_SOURCE.test(normalized);
  const layer =
    featureMatch?.[2] ??
    sharedMatch?.[1] ??
    (ROOT_INFRASTRUCTURE_FILE.test(normalized) ? "infrastructure" : null) ??
    (!rootComposition && APP_ROUTE_FILE.test(normalized) ? "presentation" : null);
  const presentationPart =
    layer === "presentation"
      ? (normalized.match(/\/presentation\/([^/]+)(?:\/|$)/)?.[1] ?? "screens")
      : null;

  return {
    feature: featureMatch?.[1] ?? null,
    layer,
    presentationPart,
    rootComposition,
    shared,
  };
}

/**
 * Classifies an alias or relative module specifier without filesystem access.
 *
 * @param {string} specifier
 * @param {string} sourceFilename
 * @returns {{ feature: string | null, layer: string | null }}
 */
function classifyModule(specifier, sourceFilename) {
  if (specifier.startsWith(".")) {
    const normalizedSource = sourceFilename.replaceAll("\\", "/");
    const resolved = path.posix.normalize(
      path.posix.join(path.posix.dirname(normalizedSource), specifier)
    );
    const target = classifyFile(resolved);
    return { feature: target.feature, layer: target.layer };
  }
  const featureMatch = specifier.match(FEATURE_IMPORT);
  if (featureMatch) {
    return { feature: featureMatch[1], layer: featureMatch[2] };
  }
  if (specifier.startsWith("@/infrastructure/")) {
    return { feature: null, layer: "infrastructure" };
  }
  const sharedMatch = specifier.match(SHARED_IMPORT);
  if (sharedMatch) {
    return { feature: null, layer: sharedMatch[1] };
  }
  return { feature: null, layer: null };
}

function isFrameworkPackage(specifier) {
  return (
    specifier === "react" ||
    specifier === "react-native" ||
    specifier.startsWith("react-native/") ||
    specifier.startsWith("expo-") ||
    specifier.startsWith("@expo/") ||
    specifier === "better-sqlite3" ||
    specifier.startsWith("drizzle-orm")
  );
}

function isPersistencePackage(specifier) {
  return (
    specifier === "expo-sqlite" ||
    specifier === "better-sqlite3" ||
    specifier.startsWith("drizzle-orm")
  );
}

/**
 * Returns a diagnostic for a forbidden dependency edge. The decision uses
 * only preclassified paths and the current module edge.
 *
 * @param {{ layer: string | null, presentationPart: string | null, rootComposition: boolean, shared: boolean }} source
 * @param {{ feature: string | null, layer: string | null }} target
 * @param {string} specifier
 * @returns {string | null}
 */
function forbiddenMessage(source, target, specifier) {
  if (specifier === APP_SERVICES_IMPORT) {
    if (source.rootComposition || source.presentationPart === "dependencies") {
      return null;
    }
    return "The global application container may only be accessed from the composition root or presentation/dependencies; consume a feature controller instead.";
  }

  if (source.shared && target.feature !== null) {
    return "Shared code cannot depend on a feature; move feature-specific behavior into its owning feature.";
  }

  if (source.layer === "domain") {
    if (
      target.layer === "application" ||
      target.layer === "infrastructure" ||
      target.layer === "presentation" ||
      isFrameworkPackage(specifier)
    ) {
      return "Domain code may depend only on domain and framework-neutral shared code.";
    }
  }

  if (source.layer === "application") {
    if (
      target.layer === "infrastructure" ||
      target.layer === "presentation" ||
      isFrameworkPackage(specifier)
    ) {
      return "Application code cannot depend on infrastructure, platform frameworks, or presentation code.";
    }
  }

  if (source.layer === "infrastructure" && target.layer === "presentation") {
    return "Infrastructure may implement application or domain ports, but cannot depend on presentation code.";
  }

  if (source.layer === "presentation") {
    if (target.layer === "infrastructure" || isPersistencePackage(specifier)) {
      return "Presentation code cannot depend on infrastructure; inject an application capability through presentation/dependencies.";
    }
    if (
      target.layer === "application" &&
      source.presentationPart !== "controllers" &&
      source.presentationPart !== "dependencies"
    ) {
      return "Only presentation/controllers may consume application APIs; components and screens must consume a controller.";
    }
  }

  return null;
}

export default {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      dynamic: "Architecture boundaries require a statically known module specifier.",
      forbidden: "{{ message }}",
    },
  },
  create(context) {
    const sourceFilename = contextFilename(context);
    const source = classifyFile(sourceFilename);
    if (!source.layer && !source.shared && !source.rootComposition) {
      return {};
    }

    /**
     * Checks imports, re-exports, and CommonJS edges through one path.
     *
     * @param {object} node
     * @param {unknown} value
     */
    function checkModuleEdge(node, value) {
      if (typeof value !== "string") {
        return;
      }
      const message = forbiddenMessage(source, classifyModule(value, sourceFilename), value);
      if (message) {
        context.report({ data: { message }, messageId: "forbidden", node });
      }
    }

    return {
      ImportDeclaration(node) {
        checkModuleEdge(node, node.source.value);
      },
      ExportNamedDeclaration(node) {
        if (node.source) {
          checkModuleEdge(node, node.source.value);
        }
      },
      ExportAllDeclaration(node) {
        checkModuleEdge(node, node.source.value);
      },
      ImportExpression(node) {
        if (node.source.type === "Literal") {
          checkModuleEdge(node, node.source.value);
        } else {
          context.report({ messageId: "dynamic", node });
        }
      },
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || node.callee.name !== "require") {
          return;
        }
        const [argument] = node.arguments;
        if (
          node.arguments.length === 1 &&
          argument?.type === "Literal" &&
          typeof argument.value === "string"
        ) {
          checkModuleEdge(node, argument.value);
        } else {
          context.report({ messageId: "dynamic", node });
        }
      },
    };
  },
};

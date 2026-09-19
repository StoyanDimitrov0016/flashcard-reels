import noAwaitInConditionalExpression from "./rules/general/no-await-in-conditional-expression.mjs";
import noEnginePolicyInPresentation from "./rules/mobile/no-engine-policy-in-presentation.mjs";
import noPersistenceOrchestrationInReactEffect from "./rules/mobile/no-persistence-orchestration-in-react-effect.mjs";
import noServiceLocatorInPresentation from "./rules/mobile/no-service-locator-in-presentation.mjs";
import noUiIndexAsDomainPosition from "./rules/mobile/no-ui-index-as-domain-position.mjs";
import noZodInDomain from "./rules/mobile/no-zod-in-domain.mjs";
import noLocalJsxVariables from "./rules/react/no-local-jsx-variables.mjs";
import preferJsxAnd from "./rules/react/prefer-jsx-and.mjs";
import requireLocalConstArrowFunctions from "./rules/react/require-local-const-arrow-functions.mjs";
import requireNamedReactEffectCallback from "./rules/react/require-named-react-effect-callback.mjs";
import requireNamedReactEffectCleanup from "./rules/react/require-named-react-effect-cleanup.mjs";
import requireReactComponentPropsType from "./rules/react/require-react-component-props-type.mjs";

export default {
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
    "require-react-component-props-type": requireReactComponentPropsType,
  },
};

import noAwaitInTernary from "./rules/async/no-await-in-ternary.mjs";
import noJsxInVariables from "./rules/react/no-jsx-in-variables.mjs";
import requireNamedEffectCallback from "./rules/react/require-named-effect-callback.mjs";
import requireReactComponentPropsType from "./rules/react/require-react-component-props-type.mjs";
import requireReactHookOptionsType from "./rules/react/require-react-hook-options-type.mjs";

export default {
  meta: { name: "flashcards" },
  rules: {
    "no-await-in-ternary": noAwaitInTernary,
    "no-jsx-in-variables": noJsxInVariables,
    "require-named-effect-callback": requireNamedEffectCallback,
    "require-react-component-props-type": requireReactComponentPropsType,
    "require-react-hook-options-type": requireReactHookOptionsType,
  },
};

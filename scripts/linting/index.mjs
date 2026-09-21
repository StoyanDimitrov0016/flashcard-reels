import requireReactComponentPropsType from "./rules/react/require-react-component-props-type.mjs";
import requireReactHookOptionsType from "./rules/react/require-react-hook-options-type.mjs";

export default {
  meta: { name: "flashcards" },
  rules: {
    "require-react-component-props-type": requireReactComponentPropsType,
    "require-react-hook-options-type": requireReactHookOptionsType,
  },
};

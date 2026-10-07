import { RuleTester } from "oxlint/plugins-dev";

/**
 * Runs rules on Oxlint's own parser, the same AST the rules see in production.
 */
export const typescriptTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "tsx" } },
});

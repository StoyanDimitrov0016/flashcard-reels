import tsParser from "@typescript-eslint/parser";
import { RuleTester } from "eslint";

/**
 * Exercises parser-neutral rules with ESLint's default JavaScript/JSX parser.
 * This keeps accidental dependencies on TypeScript-only AST shapes visible.
 */
export const javascriptTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

/**
 * Exercises TypeScript syntax and node shapes with the TypeScript-ESTree parser.
 * Production execution still uses Oxlint's AST visitor implementation.
 */
export const typescriptTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    parser: tsParser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

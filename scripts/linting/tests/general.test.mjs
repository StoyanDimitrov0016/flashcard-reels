import plugin from "../index.mjs";
import { javascriptTester } from "./testers.mjs";

javascriptTester.run(
  "no-await-in-conditional-expression",
  plugin.rules["no-await-in-conditional-expression"],
  {
    valid: [
      { code: "async function load() { const value = await loadValue(); return value; }" },
      { code: "const value = condition ? loadValue() : fallback;" },
      {
        code: "async function load() { const value = condition ? async () => await loadValue() : fallback; return value; }",
      },
    ],
    invalid: [
      {
        code: "async function load() { const value = condition ? await loadValue() : fallback; return value; }",
        errors: [{ messageId: "forbidden" }],
      },
      {
        code: "async function load() { const value = condition ? fallback : await loadValue(); return value; }",
        errors: [{ messageId: "forbidden" }],
      },
    ],
  }
);

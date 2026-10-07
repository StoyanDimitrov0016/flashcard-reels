import plugin from "../index.mjs";
import { typescriptTester } from "./testers.mjs";

typescriptTester.run("no-await-in-ternary", plugin.rules["no-await-in-ternary"], {
  valid: [
    {
      code: `async function load() {
  if (hasCachedProfile) {
    return await loadCachedProfile();
  }
  return await fetchProfile();
}`,
    },
    { code: "async function load() { return await (cached ? readCache() : fetchFresh()); }" },
    {
      code: "async function load() { const value = cached ? readCache() : fetchFresh(); return await value; }",
    },
    {
      code: "const loaders = ready ? [async () => await load()] : [];",
    },
  ],
  invalid: [
    {
      code: "async function load() { return cached ? await readCache() : await fetchFresh(); }",
      errors: [{ messageId: "awaitInTernary" }, { messageId: "awaitInTernary" }],
    },
    {
      code: "async function load() { const value = cached ? readCache() : (await fetchFresh()).body; return value; }",
      errors: [{ messageId: "awaitInTernary" }],
    },
    {
      code: "async function load() { return (await isCached()) ? readCache() : fetchFresh(); }",
      errors: [{ messageId: "awaitInTernary" }],
    },
  ],
});

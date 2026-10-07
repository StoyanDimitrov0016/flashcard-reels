import plugin from "../index.mjs";
import { typescriptTester } from "./testers.mjs";

typescriptTester.run(
  "require-named-effect-callback",
  plugin.rules["require-named-effect-callback"],
  {
    valid: [
      {
        code: `useEffect(
  function synchronizePreferences() {
    void refreshPreferences();
  },
  [refreshPreferences]
);`,
      },
      {
        code: `useEffect(function subscribeToConnectionChanges() {
  const unsubscribe = connection.subscribe(setStatus);
  return function unsubscribeFromConnectionChanges() {
    unsubscribe();
  };
}, [connection]);`,
      },
      {
        code: `useLayoutEffect(function subscribe() {
  const unsubscribe = connection.subscribe(setStatus);
  return unsubscribe;
}, []);`,
      },
      {
        code: `useEffect(function loadItems() {
  void Promise.all(ids.map((id) => load(id)));
  items.forEach(function each() { return () => {}; });
}, [ids]);`,
      },
      { code: "useMemoized(() => compute(value));" },
      { code: "useEffect(synchronizePreferences, [synchronizePreferences]);" },
    ],
    invalid: [
      {
        code: "useEffect(() => { void refresh(); }, [refresh]);",
        errors: [{ messageId: "anonymousEffect" }],
      },
      {
        code: "React.useEffect(function () { void refresh(); }, []);",
        errors: [{ messageId: "anonymousEffect" }],
      },
      {
        code: "useInsertionEffect(() => insertStyles(), []);",
        errors: [{ messageId: "anonymousEffect" }],
      },
      {
        code: `useEffect(function subscribe() {
  const unsubscribe = connection.subscribe(setStatus);
  return () => unsubscribe();
}, [connection]);`,
        errors: [{ messageId: "anonymousCleanup" }],
      },
      {
        code: `useLayoutEffect(function measure() {
  if (!ref.current) { return; }
  return function () { ref.current = null; };
}, []);`,
        errors: [{ messageId: "anonymousCleanup" }],
      },
    ],
  }
);

import plugin from "../index.mjs";
import { javascriptTester } from "./testers.mjs";

javascriptTester.run(
  "require-named-react-effect-callback",
  plugin.rules["require-named-react-effect-callback"],
  {
    valid: [
      { code: "useEffect(function synchronize() {});" },
      { code: "useLayoutEffect(() => {});" },
    ],
    invalid: [
      { code: "useEffect(() => {});", errors: 1 },
      { code: "useEffect(async () => {});", errors: 1 },
    ],
  }
);

javascriptTester.run(
  "require-named-react-effect-cleanup",
  plugin.rules["require-named-react-effect-cleanup"],
  {
    valid: [
      { code: "useEffect(function subscribe() { return function unsubscribe() {}; });" },
      { code: "useEffect(function subscribe() { const cleanup = () => {}; return cleanup; });" },
      {
        code: "useEffect(function subscribe() { function helper() { return () => {}; } helper(); });",
      },
      { code: "useLayoutEffect(function position() { return () => {}; });" },
    ],
    invalid: [
      { code: "useEffect(function subscribe() { return () => {}; });", errors: 1 },
      { code: "useEffect(function subscribe() { return function() {}; });", errors: 1 },
      {
        code: "useEffect(function subscribe() { if (active) { return () => {}; } });",
        errors: 1,
      },
    ],
  }
);

javascriptTester.run(
  "require-local-const-arrow-functions",
  plugin.rules["require-local-const-arrow-functions"],
  {
    valid: [
      { code: "function Component() { const handlePress = () => {}; return handlePress; }" },
      { code: "function moduleHelper() {}" },
      { code: "useEffect(function synchronize() { return function unsubscribe() {}; });" },
    ],
    invalid: [
      { code: "function Component() { function handlePress() {} return handlePress; }", errors: 1 },
      { code: "const useFeature = () => { function loadMore() {} return loadMore; };", errors: 1 },
    ],
  }
);

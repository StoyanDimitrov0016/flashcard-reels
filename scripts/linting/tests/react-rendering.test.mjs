import plugin from "../index.mjs";
import { javascriptTester } from "./testers.mjs";

javascriptTester.run("no-local-jsx-variables", plugin.rules["no-local-jsx-variables"], {
  valid: [
    {
      code: "function Screen() { const isReady = true; return <View>{isReady && <Content />}</View>; }",
    },
    {
      code: "function Screen() { const renderItem = () => <Row />; return <List renderItem={renderItem} />; }",
    },
    { code: "const StaticSlot = <Icon />;" },
    { code: "function Screen() { const View = () => <Content />; return <View />; }" },
  ],
  invalid: [
    {
      code: "function Screen() { const content = <Content />; return <View>{content}</View>; }",
      errors: 1,
    },
    {
      code: "const Screen = () => { const content = ready ? <Content /> : null; return <View>{content}</View>; };",
      errors: 1,
    },
    {
      code: "function Screen() { let content; if (ready) { content = <Content />; } return <View>{content}</View>; }",
      errors: 1,
    },
    {
      code: "function Screen() { const content = <><Title /><Content /></>; return content; }",
      errors: 1,
    },
    {
      code: "function Screen() { const content = ready && <Content />; return content; }",
      errors: 1,
    },
  ],
});

javascriptTester.run("prefer-jsx-and", plugin.rules["prefer-jsx-and"], {
  valid: [
    { code: "function Screen() { return <View>{ready && <Content />}</View>; }" },
    { code: "function Screen() { return <View>{count > 0 && <Content />}</View>; }" },
    { code: "function Screen() { return <View>{ready ? <Content /> : <Loading />}</View>; }" },
    { code: "function Screen() { return <View>{ready ? label : null}</View>; }" },
    { code: "function Screen() { return <View slot={ready ? <Content /> : null} />; }" },
    { code: "function Screen() { const result = ready ? data : null; return <View />; }" },
  ],
  invalid: [
    { code: "function Screen() { return <View>{ready ? <Content /> : null}</View>; }", errors: 1 },
    { code: "function Screen() { return <View>{ready ? null : <Content />}</View>; }", errors: 1 },
    { code: "function Screen() { return <View>{count ? <Content /> : null}</View>; }", errors: 1 },
    {
      code: "function Screen() { return <View>{ready ? <><Content /></> : null}</View>; }",
      errors: 1,
    },
  ],
});

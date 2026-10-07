import plugin from "../index.mjs";
import { typescriptTester } from "./testers.mjs";

typescriptTester.run("no-jsx-in-variables", plugin.rules["no-jsx-in-variables"], {
  valid: [
    {
      code: `function ProfilePage() {
  const visibleItems = items.filter(isVisible);
  return <Page><List items={visibleItems} /></Page>;
}`,
    },
    {
      code: `function List() {
  const renderItem = ({ item }) => <Row item={item} />;
  return <FlashList renderItem={renderItem} />;
}`,
    },
    { code: "const emptyIcon = <Icon name='empty' />;" },
    {
      code: `function Screen() {
  const label = isConnected ? "Connected" : "Offline";
  return <Badge>{label}</Badge>;
}`,
    },
  ],
  invalid: [
    {
      code: `function ProfilePage() {
  const status = <Badge>Connected</Badge>;
  return <Page>{status}</Page>;
}`,
      errors: [{ messageId: "storedJsx" }],
    },
    {
      code: `function ProfilePage() {
  const status = isConnected ? <Badge>Connected</Badge> : <Badge>Offline</Badge>;
  return <Page>{status}</Page>;
}`,
      errors: [{ messageId: "storedJsx" }],
    },
    {
      code: `const ProfilePage = () => {
  const banner = hasError && <Banner />;
  return <Page>{banner}</Page>;
};`,
      errors: [{ messageId: "storedJsx" }],
    },
    {
      code: `function ProfilePage() {
  let content;
  content = (<><Header /><Body /></>);
  return <Page>{content}</Page>;
}`,
      errors: [{ messageId: "storedJsx" }],
    },
  ],
});

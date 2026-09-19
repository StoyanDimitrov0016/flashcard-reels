import plugin from "../index.mjs";
import { typescriptTester } from "./testers.mjs";

typescriptTester.run(
  "require-react-component-props-type",
  plugin.rules["require-react-component-props-type"],
  {
    valid: [
      { code: "export function Component() { return <View />; }" },
      {
        code: `type ComponentProps = Readonly<{ userId: number }>;
export function Component({ userId }: ComponentProps) { return <View id={userId} />; }`,
      },
      {
        code: `type ComponentProps = Readonly<{ userId: number }>;
function Component(props: ComponentProps) { return <View id={props.userId} />; }`,
      },
      {
        code: `type ComponentProps = Readonly<{ userId?: number }>;
export const Component = ({ userId = 1 }: ComponentProps) => <View id={userId} />;`,
      },
      {
        code: `type ComponentProps = Readonly<{ userId: number }>;
const Component = function Component(props: ComponentProps) { return <View id={props.userId} />; };`,
      },
      {
        code: "function formatValue(options: { compact: boolean }) { return String(options.compact); }",
      },
      {
        code: "function ComponentFactory(options: { compact: boolean }) { return String(options.compact); }",
      },
      {
        code: `function ComponentFactory(options: { compact: boolean }) {
  const renderPreview = () => <View />;
  return renderPreview;
}`,
      },
    ],
    invalid: [
      {
        code: "export function Component({ userId }: { userId: number }) { return <View id={userId} />; }",
        errors: [{ messageId: "namedAlias" }],
      },
      {
        code: "const Component = (props: Readonly<{ userId: number }>) => <View id={props.userId} />;",
        errors: [{ messageId: "namedAlias" }],
      },
      {
        code: "function Component({ userId }) { return <View id={userId} />; }",
        errors: [{ messageId: "missingAnnotation" }],
      },
      {
        code: `type Props = Readonly<{ userId: number }>;
function Component(props: Props) { return <View id={props.userId} />; }`,
        errors: [{ messageId: "wrongTypeName" }],
      },
      {
        code: `type ComponentProps = { userId: number };
function Component(props: ComponentProps) { return <View id={props.userId} />; }`,
        errors: [{ messageId: "mutableAlias" }],
      },
      {
        code: `type ComponentProps = Readonly<{ userId: number }>;
const value = 1;
function Component(props: ComponentProps) { return <View id={props.userId + value} />; }`,
        errors: [{ messageId: "adjacentAlias" }],
      },
      {
        code: `interface ComponentProps { userId: number }
function Component(props: ComponentProps) { return <View id={props.userId} />; }`,
        errors: [{ messageId: "adjacentAlias" }],
      },
      {
        code: `import type { ComponentProps } from "./types";
function Component(props: ComponentProps) { return <View id={props.userId} />; }`,
        errors: [{ messageId: "adjacentAlias" }],
      },
      {
        code: `type OtherProps = Readonly<{ userId: number }>;
type ComponentProps = Readonly<{ userId: number }>;
function Component(props: OtherProps) { return <View id={props.userId} />; }`,
        errors: [{ messageId: "wrongTypeName" }],
      },
    ],
  }
);

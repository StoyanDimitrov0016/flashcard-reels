import plugin from "../index.mjs";
import { typescriptTester } from "./testers.mjs";

typescriptTester.run(
  "require-react-hook-options-type",
  plugin.rules["require-react-hook-options-type"],
  {
    valid: [
      { code: 'export function useCurrentLocale() { return "en"; }' },
      { code: "export function useDeck(deckId: string) { return deckId; }" },
      {
        code: `type ReelControllerOptions = Readonly<{ initialFeed: string }>;
export function useReelController({ initialFeed }: ReelControllerOptions) {
  return initialFeed;
}`,
      },
      {
        code: `type ReelFeedOptions = Readonly<{ itemCount: number }>;
function useReelFeed({ itemCount }: ReelFeedOptions) {
  return itemCount;
}`,
      },
    ],
    invalid: [
      {
        code: "export function useReelController({ initialFeed }) { return initialFeed; }",
        errors: [{ messageId: "missingAnnotation" }],
      },
      {
        code: `type UseReelControllerParameters = Readonly<{ initialFeed: string }>;
export function useReelController({ initialFeed }: UseReelControllerParameters) {
  return initialFeed;
}`,
        errors: [{ messageId: "wrongTypeName" }],
      },
      {
        code: `type ReelControllerOptions = { initialFeed: string };
export function useReelController({ initialFeed }: ReelControllerOptions) {
  return initialFeed;
}`,
        errors: [{ messageId: "mutableAlias" }],
      },
      {
        code: `type OtherOptions = Readonly<{ initialFeed: string }>;
export function useReelController({ initialFeed }: ReelControllerOptions) {
  return initialFeed;
}`,
        errors: [{ messageId: "adjacentAlias" }],
      },
    ],
  }
);

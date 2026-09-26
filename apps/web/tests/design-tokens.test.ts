import { darkColors, lightColors, type AppColors } from "@flashcard-reels/design-tokens";
import fs from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const DeclarationPattern = /--([a-z-]+):\s*([^;]+);/g;

// The web CSS mirrors the TypeScript palette the mobile app uses; both must stay identical.
const cssToToken: Readonly<Record<string, keyof AppColors>> = {
  "action-primary": "actionPrimary",
  "action-primary-text": "actionPrimaryText",
  "border-strong": "borderStrong",
  "border-subtle": "borderSubtle",
  canvas: "canvas",
  "code-surface": "codeSurface",
  "code-text": "codeText",
  error: "error",
  interactive: "interactive",
  "interactive-hover": "interactiveHover",
  navigation: "navigation",
  overlay: "overlay",
  success: "success",
  "surface-hover": "surfaceHover",
  "surface-raised": "surfaceRaised",
  "surface-subtle": "surfaceSubtle",
  "text-primary": "textPrimary",
  "text-secondary": "textSecondary",
  "text-tertiary": "textTertiary",
  warning: "warning",
};

function normalize(color: string): string {
  const value = color.trim().toLowerCase().replaceAll(/\s+/g, "");
  if (/^#[0-9a-f]{3}$/.test(value)) {
    return `#${value
      .slice(1)
      .split("")
      .map((digit) => digit + digit)
      .join("")}`;
  }
  return value;
}

function declarations(block: string): Map<string, string> {
  return new Map(
    [...block.matchAll(DeclarationPattern)].map(([, name = "", value = ""]) => [
      name,
      normalize(value),
    ])
  );
}

const require = createRequire(import.meta.url);
const css = fs.readFileSync(require.resolve("@flashcard-reels/design-tokens/theme.css"), "utf8");
const [lightBlock = "", darkBlock = ""] = css.split(".dark");

describe.each([
  ["light", declarations(lightBlock), lightColors],
  ["dark", declarations(darkBlock), darkColors],
] as const)("%s web theme", (_scheme, cssColors, tokens) => {
  it("matches the shared TypeScript palette", () => {
    for (const [cssName, tokenName] of Object.entries(cssToToken)) {
      expect({ [cssName]: cssColors.get(cssName) }).toEqual({
        [cssName]: normalize(tokens[tokenName]),
      });
    }
  });
});

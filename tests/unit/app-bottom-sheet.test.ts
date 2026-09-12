import { describe, expect, it } from "vitest";

import { resolveAppBottomSheetConfig } from "@/shared/presentation/components/app-bottom-sheet-config";

describe("AppBottomSheet semantic sizes", () => {
  it("maps content to dynamic sizing", () => {
    expect(resolveAppBottomSheetConfig("content")).toEqual({ enableDynamicSizing: true });
  });

  it.each([
    ["half", ["50%"]],
    ["full", ["100%"]],
    ["half-full", ["50%", "100%"]],
  ] as const)("maps %s to the supported snap points", (size, snapPoints) => {
    expect(resolveAppBottomSheetConfig(size)).toEqual({
      enableDynamicSizing: false,
      snapPoints,
    });
  });
});

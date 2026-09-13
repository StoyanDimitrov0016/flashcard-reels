import { describe, expect, it } from "vitest";

import { resolveAppBottomSheetConfig } from "@/shared/presentation/components/app-bottom-sheet-config";

describe("AppBottomSheet semantic sizes", () => {
  it("maps content to dynamic sizing", () => {
    expect(resolveAppBottomSheetConfig("content")).toEqual({ enableDynamicSizing: true });
  });

  it("maps large to content-driven 75% sizing", () => {
    expect(resolveAppBottomSheetConfig("large")).toEqual({
      contentHeightRatio: 0.75,
      enableDynamicSizing: true,
    });
  });

  it.each([
    ["half", ["50%", "100%"]],
    ["full", ["100%"]],
  ] as const)("maps %s to the supported snap points", (size, snapPoints) => {
    expect(resolveAppBottomSheetConfig(size)).toEqual({
      enableDynamicSizing: false,
      snapPoints,
    });
  });
});

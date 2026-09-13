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

  it("maps medium to content-driven 60% sizing", () => {
    expect(resolveAppBottomSheetConfig("medium")).toEqual({
      contentHeightRatio: 0.6,
      enableDynamicSizing: true,
    });
  });

  it("maps half to the supported snap points", () => {
    expect(resolveAppBottomSheetConfig("half")).toEqual({
      enableDynamicSizing: false,
      snapPoints: ["50%", "100%"],
    });
  });
});

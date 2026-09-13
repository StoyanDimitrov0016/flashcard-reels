export type AppBottomSheetSize = "content" | "half" | "large" | "full";

export function resolveAppBottomSheetConfig(size: AppBottomSheetSize): Readonly<{
  contentHeightRatio?: number;
  enableDynamicSizing: boolean;
  snapPoints?: string[];
}> {
  if (size === "content") {
    return { enableDynamicSizing: true };
  }
  if (size === "half") {
    return { enableDynamicSizing: false, snapPoints: ["50%", "100%"] };
  }
  if (size === "full") {
    return { enableDynamicSizing: false, snapPoints: ["100%"] };
  }
  return { contentHeightRatio: 0.75, enableDynamicSizing: true };
}

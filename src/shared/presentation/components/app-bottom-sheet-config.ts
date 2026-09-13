export type AppBottomSheetSize = "content" | "half" | "medium" | "large";

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
  if (size === "medium") {
    return { contentHeightRatio: 0.6, enableDynamicSizing: true };
  }
  return { contentHeightRatio: 0.75, enableDynamicSizing: true };
}

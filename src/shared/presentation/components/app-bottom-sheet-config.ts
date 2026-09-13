export type AppBottomSheetSize = "content" | "half" | "full" | "half-full";

export function resolveAppBottomSheetConfig(size: AppBottomSheetSize): Readonly<{
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
  return { enableDynamicSizing: false, snapPoints: ["50%", "100%"] };
}

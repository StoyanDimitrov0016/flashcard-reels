export function shouldInstallBundledDeck(
  installedVersion: number | null,
  bundledVersion: number
): boolean {
  return installedVersion === null || installedVersion < bundledVersion;
}

export function shouldApplyBundledAppearance(status: "installed" | "updated" | "no-op"): boolean {
  return status === "installed";
}

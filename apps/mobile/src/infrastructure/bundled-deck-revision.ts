export function shouldInstallBundledDeck(
  installedRevision: number | null,
  bundledRevision: number
): boolean {
  return installedRevision === null || installedRevision < bundledRevision;
}

export function shouldApplyBundledAppearance(status: "installed" | "updated" | "no-op"): boolean {
  return status === "installed";
}

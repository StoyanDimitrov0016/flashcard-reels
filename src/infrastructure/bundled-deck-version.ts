export function shouldInstallBundledDeck(
  installedVersion: number | null,
  bundledVersion: number
): boolean {
  return installedVersion === null || installedVersion < bundledVersion;
}

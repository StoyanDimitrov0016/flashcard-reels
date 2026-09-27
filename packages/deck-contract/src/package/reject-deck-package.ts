import { DeckPackageParseError } from "../errors/deck-package-parse-error.ts";

export function rejectDeckPackage(message: string, path: readonly (string | number)[] = []): never {
  throw new DeckPackageParseError([{ path, message }]);
}

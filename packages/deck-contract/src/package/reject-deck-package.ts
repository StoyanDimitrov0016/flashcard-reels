import { DeckPackageParseError } from "../errors/deck-package-parse-error";

export function rejectDeckPackage(message: string, path: readonly (string | number)[] = []): never {
  throw new DeckPackageParseError([{ path, message }]);
}

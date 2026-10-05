import { DeckContractError } from "./deck-contract-error.ts";

/** Invalid authored section metadata, with a source line for repair. */
export class LessonMarkdownParseError extends DeckContractError {
  readonly line: number;

  constructor(message: string, line: number) {
    super({
      name: "LessonMarkdownParseError",
      code: "DECK_PACKAGE_INVALID",
      message: `${message} at line ${line}`,
      context: { line },
    });
    this.line = line;
  }
}

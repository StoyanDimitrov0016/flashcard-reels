# Deck contract

This package owns the published deck manifest and package validation shared by future mobile and web consumers. Import only from `@flashcard-reels/deck-contract`; the `src` submodules are implementation details and are not package exports.

The public surface is `parseDeck`, `parseDeckPackage`, the parsed data types, and the contract error classes and issue types. `parseDeck` checks the manifest schema and cross-entry relationships. `parseDeckPackage` also checks the ZIP archive and every referenced asset.

Internally, `validation/` handles manifest validation, `package/` handles archive and asset reading, and `errors/` defines the error shape and issue reporting. The package error base carries `name`, `code`, `message`, `cause`, and optional `context`, matching the fields used by the app error model without importing from either app. Package parsing wraps a manifest `DeckParseError` in a `DeckPackageParseError` and retains it as the cause.

Run `npm run check -w @flashcard-reels/deck-contract` and `npm test -w @flashcard-reels/deck-contract` from the repository root.

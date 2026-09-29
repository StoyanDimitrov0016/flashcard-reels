import { z } from "zod";

/**
 * Published decks live in one bucket, split by channel. Prod serves daily study; dev holds small
 * test decks. The dev prefix does not start with the prod prefix, so listing prod never
 * includes dev objects.
 */
const DECK_CHANNEL_PREFIXES = {
  prod: "decks/",
  dev: "dev/decks/",
} as const;

export const DeckChannelSchema = z.enum(["prod", "dev"]);

export type DeckChannel = z.infer<typeof DeckChannelSchema>;

export function deckChannelPrefix(channel: DeckChannel): string {
  return DECK_CHANNEL_PREFIXES[channel];
}

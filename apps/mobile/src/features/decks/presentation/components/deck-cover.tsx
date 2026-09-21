import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";

import type { DeckCoverAsset } from "@/features/decks/domain/deck.model";

import { fontSize, fontWeight } from "@/shared/presentation/typography";

const symbolNames = {
  cards: { android: "book_2", ios: "rectangle.stack.fill", web: "book_2" },
  "computer-science": { android: "terminal", ios: "terminal.fill", web: "terminal" },
  database: { android: "database", ios: "cylinder.split.1x2.fill", web: "database" },
  "operating-systems": { android: "memory", ios: "memorychip.fill", web: "memory" },
  react: { android: "data_object", ios: "atom", web: "data_object" },
  "system-design": { android: "account_tree", ios: "square.3.layers.3d", web: "account_tree" },
} as const;

type DeckCoverProps = Readonly<{
  accentColor: string;
  asset: DeckCoverAsset;
  size?: "medium" | "large";
}>;

export function DeckCover({ accentColor, asset, size = "medium" }: DeckCoverProps) {
  const dimension = size === "large" ? 58 : 44;
  const iconSize = size === "large" ? 30 : 25;

  return (
    <View
      accessibilityLabel={`${asset.replaceAll("-", " ")} deck cover`}
      style={[
        styles.cover,
        {
          backgroundColor: `${accentColor}18`,
          borderColor: `${accentColor}44`,
          height: dimension,
          width: dimension,
        },
      ]}
    >
      {asset === "javascript" ? (
        <Text style={[styles.javascript, { color: accentColor }]}>JS</Text>
      ) : (
        <SymbolView name={symbolNames[asset]} size={iconSize} tintColor={accentColor} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    alignItems: "center",
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: "center",
  },
  javascript: { fontSize: fontSize.subhead, fontWeight: fontWeight.heavy },
});

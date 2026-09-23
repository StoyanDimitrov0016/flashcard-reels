import { Platform, Text, type StyleProp, type TextStyle } from "react-native";

import { splitFlashcardText } from "@/features/flashcards/domain/flashcard-text";

// Android's monospace face has no heavy weights, so bold keeps code spans from looking thinner than
// the surrounding question text.
const codeStyle: TextStyle = {
  fontFamily: Platform.select({ android: "monospace", default: "Menlo" }),
  fontWeight: "bold",
};

type FlashcardTextProps = Readonly<{
  text: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}>;

/** Renders question or answer text, with backtick code spans in a monospace face. */
export function FlashcardText({ text, style, numberOfLines }: FlashcardTextProps) {
  return (
    <Text numberOfLines={numberOfLines} style={style}>
      {splitFlashcardText(text).map((segment, index) =>
        segment.code ? (
          // Segments come from immutable card text, so their position is their identity.
          // oxlint-disable-next-line react/no-array-index-key
          <Text key={index} style={codeStyle}>
            {segment.text}
          </Text>
        ) : (
          segment.text
        )
      )}
    </Text>
  );
}

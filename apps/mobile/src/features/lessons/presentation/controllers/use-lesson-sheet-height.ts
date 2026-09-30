import { useWindowDimensions } from "react-native";

// Reading and choosing a lesson share a fixed size over the current flashcard.
const LESSON_SHEET_HEIGHT_RATIO = 0.6;

export function useLessonSheetHeight(): number {
  return useWindowDimensions().height * LESSON_SHEET_HEIGHT_RATIO;
}

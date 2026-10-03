import { type SymbolViewProps } from "expo-symbols";

import type { Rating } from "@/features/learning-engine/domain/rating";
import type { AppColors } from "@/shared/presentation/theme";

export type RecallOption = Readonly<{
  color: keyof Pick<AppColors, "recallAgain" | "recallHard" | "recallGood" | "recallEasy">;
  label: string;
  rating: Rating;
  symbol: SymbolViewProps["name"];
}>;

export const recallOptions: readonly RecallOption[] = [
  {
    color: "recallAgain",
    label: "Again",
    rating: "again",
    symbol: { android: "replay", ios: "arrow.counterclockwise", web: "replay" },
  },
  {
    color: "recallHard",
    label: "Hard",
    rating: "hard",
    symbol: { android: "speed", ios: "tortoise.fill", web: "speed" },
  },
  {
    color: "recallGood",
    label: "Good",
    rating: "good",
    symbol: { android: "check_circle", ios: "checkmark.circle.fill", web: "check_circle" },
  },
  {
    color: "recallEasy",
    label: "Easy",
    rating: "easy",
    symbol: { android: "bolt", ios: "bolt.fill", web: "bolt" },
  },
];

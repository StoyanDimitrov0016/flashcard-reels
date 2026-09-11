import { type SymbolViewProps } from "expo-symbols";

import type { RecallLevel } from "@/features/study/domain/recall-level";
import type { AppColors } from "@/shared/presentation/theme";

export type RecallOption = Readonly<{
  color: keyof Pick<AppColors, "recallAgain" | "recallHard" | "recallGood" | "recallEasy">;
  label: string;
  level: RecallLevel;
  symbol: SymbolViewProps["name"];
}>;

export const recallOptions: readonly RecallOption[] = [
  {
    color: "recallAgain",
    label: "Again",
    level: "again",
    symbol: { android: "replay", ios: "arrow.counterclockwise", web: "replay" },
  },
  {
    color: "recallHard",
    label: "Hard",
    level: "hard",
    symbol: { android: "speed", ios: "tortoise.fill", web: "speed" },
  },
  {
    color: "recallGood",
    label: "Good",
    level: "good",
    symbol: { android: "check_circle", ios: "checkmark.circle.fill", web: "check_circle" },
  },
  {
    color: "recallEasy",
    label: "Easy",
    level: "easy",
    symbol: { android: "bolt", ios: "bolt.fill", web: "bolt" },
  },
];

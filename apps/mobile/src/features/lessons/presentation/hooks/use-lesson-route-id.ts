import { useLocalSearchParams } from "expo-router";
import { z } from "zod";

const LessonIdSchema = z.string().min(1);

export function useLessonRouteId(): string | null {
  const { lessonId } = useLocalSearchParams();
  const parsed = LessonIdSchema.safeParse(lessonId);
  return parsed.success ? parsed.data : null;
}

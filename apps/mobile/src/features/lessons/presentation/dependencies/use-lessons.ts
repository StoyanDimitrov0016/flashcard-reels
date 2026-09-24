import type { LessonService } from "@/features/lessons/domain/lesson.service";

import { useAppServices } from "@/infrastructure/app-services";

export type LessonsCapability = Readonly<{
  lessonService: LessonService;
}>;

export function useLessonsCapability(): LessonsCapability {
  const { lessonService } = useAppServices();

  return { lessonService };
}

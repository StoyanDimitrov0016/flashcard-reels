import type { Lesson, LessonId } from "@/features/lessons/domain/lesson.model";

export interface LessonRepository {
  findById(id: LessonId): Promise<Lesson | null>;
}

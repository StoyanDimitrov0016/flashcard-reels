import type { DeckReadingList, Lesson, LessonId } from "@/features/lessons/domain/lesson.model";

export interface LessonService {
  listReadingLists(): Promise<DeckReadingList[]>;
  findById(id: LessonId): Promise<Lesson | null>;
}

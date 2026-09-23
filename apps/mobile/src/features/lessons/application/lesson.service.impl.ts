import type { DeckReadingList, Lesson, LessonId } from "@/features/lessons/domain/lesson.model";
import type { LessonRepository } from "@/features/lessons/domain/lesson.repository";
import type { LessonService } from "@/features/lessons/domain/lesson.service";
import type { ReadingListQuery } from "@/features/lessons/domain/reading-list.query";

export class LessonServiceImpl implements LessonService {
  private readonly lessonRepository: LessonRepository;
  private readonly readingListQuery: ReadingListQuery;

  constructor(lessonRepository: LessonRepository, readingListQuery: ReadingListQuery) {
    this.lessonRepository = lessonRepository;
    this.readingListQuery = readingListQuery;
  }

  async listReadingLists(): Promise<DeckReadingList[]> {
    return this.readingListQuery.listReadingLists();
  }

  async findById(id: LessonId): Promise<Lesson | null> {
    return this.lessonRepository.findById(id);
  }
}

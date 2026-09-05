import type { StudySessionItem } from "@/features/study/domain/study-session-item.model";

export interface StudySessionItemRepository {
  createMany(items: readonly StudySessionItem[]): Promise<void>;
  listBySessionId(studySessionId: string): Promise<StudySessionItem[]>;
}

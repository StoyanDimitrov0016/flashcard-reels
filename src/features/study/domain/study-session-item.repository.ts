import type { StudySessionItem } from "@/features/study/domain/study-session-item.model";

export interface StudySessionItemRepository {
  createMany(items: readonly StudySessionItem[]): Promise<void>;
  findMaxBaseFeedPosition(studySessionId: string): Promise<number | null>;
  findMaxReelPosition(studySessionId: string): Promise<number | null>;
  listBySessionId(studySessionId: string): Promise<StudySessionItem[]>;
  listBySessionIdInReelPositionRange(
    studySessionId: string,
    fromReelPosition: number,
    throughReelPosition: number
  ): Promise<StudySessionItem[]>;
}

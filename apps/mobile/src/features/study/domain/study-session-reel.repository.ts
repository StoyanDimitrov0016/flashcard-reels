import type { StudySessionReel } from "@/features/study/domain/study-session-reel.model";

export interface StudySessionReelRepository {
  createMany(items: readonly StudySessionReel[]): Promise<void>;
  findMaxBaseFeedPosition(studySessionId: string): Promise<number | null>;
  findMaxReelPosition(studySessionId: string): Promise<number | null>;
  listBySessionId(studySessionId: string): Promise<StudySessionReel[]>;
  listBySessionIdInReelPositionRange(
    studySessionId: string,
    fromReelPosition: number,
    throughReelPosition: number
  ): Promise<StudySessionReel[]>;
}

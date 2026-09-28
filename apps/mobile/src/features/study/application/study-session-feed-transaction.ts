import type { StudySessionReel } from "@/features/study/domain/study-session-reel.model";

export interface StudySessionFeedTransaction {
  append(sessionId: string, items: readonly StudySessionReel[], feedState: string): Promise<void>;
  updateState(sessionId: string, feedState: string): Promise<void>;
}

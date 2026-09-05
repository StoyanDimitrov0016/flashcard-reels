import type { StudySession } from "@/features/study/domain/study-session.model";

export interface StudySessionRepository {
  completeOpenSessions(completedAt: string): Promise<void>;
  create(session: StudySession): Promise<void>;
  updateCurrentPosition(sessionId: string, currentPosition: number): Promise<boolean>;
}

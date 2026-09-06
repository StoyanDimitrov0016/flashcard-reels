import type { StudySessionItem } from "@/features/study/domain/study-session-item.model";

export interface StudySessionFeedTransaction {
  append(
    sessionId: string,
    items: readonly StudySessionItem[],
    strategyState: string
  ): Promise<void>;
}

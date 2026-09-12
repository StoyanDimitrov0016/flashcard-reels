export interface StudySessionMaintenanceTransaction {
  compact(sessionId: string, minimumRetainedReelPosition: number): Promise<void>;
}

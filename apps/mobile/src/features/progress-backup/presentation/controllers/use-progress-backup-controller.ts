import { useEffect, useRef, useState } from "react";

import type { PreparedProgressRestore } from "@/features/progress-backup/application/progress-backup.service";

import { useLearningProgressRevision } from "@/features/flashcard-progress/presentation/context/learning-progress-revision-context";
import { useProgressBackup } from "@/features/progress-backup/presentation/dependencies/use-progress-backup";
import { getProgressBackupErrorFeedback } from "@/features/progress-backup/presentation/progress-backup-error-feedback";
import { reportError } from "@/shared/errors/report-error";

export type { PreparedProgressRestore };

export function useProgressBackupController() {
  const { progressBackupService } = useProgressBackup();
  const { invalidateLearningProgress } = useLearningProgressRevision();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<PreparedProgressRestore | null>(null);
  const [hasSafetyCopy, setHasSafetyCopy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void progressBackupService
      .hasSafetyCopy()
      .then((exists) => {
        if (active) {
          setHasSafetyCopy(exists);
        }
      })
      .catch((cause: unknown) => reportError(cause, "Progress backup availability failure"));
    return () => {
      active = false;
    };
  }, [progressBackupService]);

  const exportProgress = async () => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await progressBackupService.exportProgress();
    } catch (cause) {
      reportError(cause, "Progress export failure");
      setError(getProgressBackupErrorFeedback(cause, "export"));
    } finally {
      invalidateLearningProgress();
      inFlight.current = false;
      setBusy(false);
    }
  };

  const pickBackup = async () => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setPrepared(await progressBackupService.prepareRestore());
    } catch (cause) {
      reportError(cause, "Progress backup validation failure");
      setError(getProgressBackupErrorFeedback(cause, "read"));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const restore = async () => {
    if (inFlight.current || !prepared) {
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await progressBackupService.restore(prepared);
      setHasSafetyCopy(true);
      setPrepared(null);
      setNotice("Learning progress restored. Your previous progress backup is available below.");
    } catch (cause) {
      reportError(cause, "Progress restore failure");
      setError(getProgressBackupErrorFeedback(cause, "restore"));
    } finally {
      invalidateLearningProgress();
      inFlight.current = false;
      setBusy(false);
    }
  };

  const shareSafetyCopy = async () => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await progressBackupService.shareSafetyCopy();
    } catch (cause) {
      reportError(cause, "Previous progress backup sharing failure");
      setError(getProgressBackupErrorFeedback(cause, "share"));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const cancelRestore = () => {
    if (!busy) {
      setPrepared(null);
      setError(null);
    }
  };

  return {
    busy,
    prepared,
    hasSafetyCopy,
    error,
    notice,
    exportProgress,
    pickBackup,
    restore,
    shareSafetyCopy,
    cancelRestore,
  };
}

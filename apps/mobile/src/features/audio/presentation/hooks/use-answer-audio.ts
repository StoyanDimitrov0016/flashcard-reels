import { useCallback, useEffect, useState } from "react";
import { useAudioPlayer, useAudioPlayerStatus, type AudioSource } from "expo-audio";

import type { AudioReference } from "@/features/audio/domain/audio-reference";
import { toOperationError } from "@/shared/errors/normalize-error";
import { reportError } from "@/shared/errors/report-error";

type PlaybackFailure = Readonly<{ error: Error; uri: string | null }>;

export function useAnswerAudio(reference: AudioReference) {
  const source: AudioSource = reference;
  const player = useAudioPlayer(source, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const [playbackFailure, setPlaybackFailure] = useState<PlaybackFailure | null>(null);
  const recordPlaybackFailure = useCallback(
    (error: unknown, operation: string) => {
      const playbackError = toOperationError(error, {
        code: "AUDIO_PLAYBACK_FAILED",
        context: { operation },
        message: "Audio is unavailable for this card",
      });
      reportError(playbackError, "Audio playback failure");
      setPlaybackFailure({ error: playbackError, uri: reference?.uri ?? null });
    },
    [reference]
  );
  const playbackError =
    playbackFailure?.uri === (reference?.uri ?? null) ? playbackFailure.error : null;

  useEffect(
    function synchronizeEmptyAudioSource() {
      if (!source) {
        try {
          player.pause();
        } catch (error) {
          void Promise.resolve().then(() => recordPlaybackFailure(error, "audio.pause"));
        }
        try {
          const seek = player.seekTo(0);
          void Promise.resolve(seek).catch((error: unknown) => {
            recordPlaybackFailure(error, "audio.seek");
          });
        } catch (error) {
          void Promise.resolve().then(() => recordPlaybackFailure(error, "audio.seek"));
        }
      }
    },
    [player, recordPlaybackFailure, source]
  );

  const togglePlayback = useCallback(async () => {
    try {
      if (status.playing) {
        player.pause();
        return;
      }

      if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) {
        await player.seekTo(0);
      }

      player.play();
      setPlaybackFailure(null);
    } catch (error) {
      recordPlaybackFailure(error, "audio.toggle");
    }
  }, [
    player,
    recordPlaybackFailure,
    status.currentTime,
    status.didJustFinish,
    status.duration,
    status.playing,
  ]);

  return { playbackError, player, status, togglePlayback };
}

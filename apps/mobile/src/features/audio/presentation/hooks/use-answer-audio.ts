import { useEffect } from "react";
import { useAudioPlayer, useAudioPlayerStatus, type AudioSource } from "expo-audio";

import type { AudioReference } from "@/features/audio/domain/audio-reference";

export function useAnswerAudio(reference: AudioReference) {
  const source: AudioSource = reference;
  const player = useAudioPlayer(source, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);

  useEffect(
    function synchronizeEmptyAudioSource() {
      if (!source) {
        player.pause();
        void player.seekTo(0);
      }
    },
    [player, source]
  );

  const togglePlayback = async () => {
    if (status.playing) {
      player.pause();
      return;
    }

    if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) {
      await player.seekTo(0);
    }

    player.play();
  };

  return { player, status, togglePlayback };
}

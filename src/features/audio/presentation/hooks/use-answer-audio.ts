import { useEffect } from "react";
import { useAudioPlayer, useAudioPlayerStatus, type AudioSource } from "expo-audio";

export function useAnswerAudio(source: AudioSource) {
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

  const replay = async () => {
    await player.seekTo(0);
    player.play();
  };

  return { player, replay, status, togglePlayback };
}

import type { AudioSource } from "expo-audio";

import sdAvailability from "../../../../assets/audio/system-design/sd-availability.mp3";
import sdBlobStorage from "../../../../assets/audio/system-design/sd-blob-storage.mp3";
import sdCapTheorem from "../../../../assets/audio/system-design/sd-cap-theorem.mp3";
import sdCircuitBreaker from "../../../../assets/audio/system-design/sd-circuit-breaker.mp3";
import sdEventDriven from "../../../../assets/audio/system-design/sd-event-driven.mp3";
import sdHorizontal from "../../../../assets/audio/system-design/sd-horizontal.mp3";
import sdLeaderElection from "../../../../assets/audio/system-design/sd-leader-election.mp3";
import sdObservability from "../../../../assets/audio/system-design/sd-observability.mp3";
import sdOutbox from "../../../../assets/audio/system-design/sd-outbox.mp3";
import sdPartitioning from "../../../../assets/audio/system-design/sd-partitioning.mp3";
import sdRateLimit from "../../../../assets/audio/system-design/sd-rate-limit.mp3";
import sdReplication from "../../../../assets/audio/system-design/sd-replication.mp3";
import sdRetry from "../../../../assets/audio/system-design/sd-retry.mp3";
import sdScalability from "../../../../assets/audio/system-design/sd-scalability.mp3";
import sdSharding from "../../../../assets/audio/system-design/sd-sharding.mp3";
import sdTimeout from "../../../../assets/audio/system-design/sd-timeout.mp3";
import sdVertical from "../../../../assets/audio/system-design/sd-vertical.mp3";
import systemDesignCache from "../../../../assets/audio/system-design/system-design-cache.mp3";
import systemDesignConsistency from "../../../../assets/audio/system-design/system-design-consistency.mp3";
import systemDesignQueue from "../../../../assets/audio/system-design/system-design-queue.mp3";

export const answerAudioAssets: Readonly<Record<string, AudioSource>> = {
  "sd-availability": sdAvailability,
  "sd-blob-storage": sdBlobStorage,
  "sd-cap-theorem": sdCapTheorem,
  "sd-circuit-breaker": sdCircuitBreaker,
  "sd-event-driven": sdEventDriven,
  "sd-horizontal": sdHorizontal,
  "sd-leader-election": sdLeaderElection,
  "sd-observability": sdObservability,
  "sd-outbox": sdOutbox,
  "sd-partitioning": sdPartitioning,
  "sd-rate-limit": sdRateLimit,
  "sd-replication": sdReplication,
  "sd-retry": sdRetry,
  "sd-scalability": sdScalability,
  "sd-sharding": sdSharding,
  "sd-timeout": sdTimeout,
  "sd-vertical": sdVertical,
  "system-design-cache": systemDesignCache,
  "system-design-consistency": systemDesignConsistency,
  "system-design-queue": systemDesignQueue,
};

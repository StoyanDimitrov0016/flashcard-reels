import { useAppServices } from "@/infrastructure/app-services";
import type { ReelFeedService } from "@/features/reels/domain/reel-feed.service";

export type ReelsCapability = Readonly<{
  reelFeedService: ReelFeedService;
}>;

export function useReels(): ReelsCapability {
  const { reelFeedService } = useAppServices();

  return { reelFeedService };
}

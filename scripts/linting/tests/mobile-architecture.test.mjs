import plugin from "../index.mjs";
import { javascriptTester } from "./testers.mjs";

javascriptTester.run("enforce-layer-boundaries", plugin.rules["enforce-layer-boundaries"], {
  valid: [
    {
      code: 'import { useReelController } from "./use-reel-controller";',
      filename: "src/features/reels/presentation/components/reel-feed.tsx",
    },
    {
      code: 'import { AppServicesProvider } from "@/infrastructure/app-services";',
      filename: "src/app/_layout.tsx",
    },
    {
      code: 'import { useAppServices } from "@/infrastructure/app-services";',
      filename: "src/features/reels/presentation/dependencies/use-reels.ts",
    },
    {
      code: 'import { ReelFeedService } from "@/features/reels/application/reel-feed.service";',
      filename: "src/features/reels/presentation/controllers/use-reel-controller.ts",
    },
    {
      code: 'import { z } from "zod";',
      filename: "src/features/reels/domain/reel-feed.ts",
    },
    {
      code: 'import { DeckService } from "@/features/decks/application/deck.service";',
      filename: "src/infrastructure/app-services.tsx",
    },

    {
      code: 'import { helper } from "../helper";',
      filename: "src/features/reels/domain/nested/value.ts",
    },
    {
      code: 'import { getErrorFeedback } from "@/shared/presentation/errors/get-error-feedback";',
      filename: "src/shared/presentation/haptics.ts",
    },
  ],
  invalid: [
    {
      code: 'import { useAppServices } from "@/infrastructure/app-services";',
      filename: "src/app/(tabs)/progress.tsx",
      errors: 1,
    },
    {
      code: 'import { useAppServices } from "@/infrastructure/app-services";',
      filename: "src/features/reels/presentation/components/reel-feed.tsx",
      errors: 1,
    },
    {
      code: 'import { createFeed } from "@/features/reels/application/create-feed";',
      filename: "src/features/reels/presentation/screens/discover-screen.tsx",
      errors: 1,
    },
    {
      code: 'import { database } from "@/infrastructure/sqlite/database";',
      filename: "src/features/reels/presentation/controllers/use-reels.ts",
      errors: 1,
    },
    {
      code: 'import { ReelCard } from "@/features/reels/presentation/components/reel-card";',
      filename: "src/features/reels/application/create-feed.ts",
      errors: 1,
    },
    {
      code: 'import { ReelFeedService } from "@/features/reels/application/reel-feed.service";',
      filename: "src/features/reels/domain/reel-feed.ts",
      errors: 1,
    },
    {
      code: 'import React from "react";',
      filename: "src/features/reels/domain/reel-feed.ts",
      errors: 1,
    },
    {
      code: 'import { ReelCard } from "@/features/reels/presentation/components/reel-card";',
      filename: "src/features/reels/infrastructure/sqlite-reel.repository.ts",
      errors: 1,
    },
    {
      code: 'import { useAppServices } from "@/infrastructure/app-services";',
      filename: "src/shared/presentation/components/global-error-state.tsx",
      errors: 1,
    },
    {
      code: 'import { reportError } from "@/shared/presentation/errors/report-error";',
      filename: "src/infrastructure/app-recovery.ts",
      errors: 1,
    },

    {
      code: 'import { File } from "expo-file-system";',
      filename: "src/features/decks/application/import-deck.ts",
      errors: 1,
    },
    {
      code: 'import { HapticEvent } from "@/features/preferences/domain/haptic-event";',
      filename: "src/shared/presentation/haptics.ts",
      errors: [
        {
          message:
            "Shared code cannot depend on a feature; move feature-specific behavior into its owning feature.",
        },
      ],
    },
    {
      code: 'import { HapticEvent } from "../../features/preferences/domain/haptic-event";',
      filename: "src/shared/presentation/haptics.ts",
      errors: [
        {
          message:
            "Shared code cannot depend on a feature; move feature-specific behavior into its owning feature.",
        },
      ],
    },

    {
      code: 'import { Audio } from "expo-audio";',
      filename: "src/features/audio/domain/audio-reference.ts",
      errors: 1,
    },
    {
      code: 'export { ReelCard } from "@/features/reels/presentation/components/reel-card";',
      filename: "src/features/reels/application/index.ts",
      errors: 1,
    },
    {
      code: 'const database = import("@/infrastructure/sqlite/database");',
      filename: "src/features/reels/presentation/controllers/use-reels.ts",
      errors: 1,
    },
    {
      code: 'import { ReelCard } from "../presentation/components/reel-card";',
      filename: "src/features/reels/application/create-feed.ts",
      errors: 1,
    },
    {
      code: 'const database = require("../../../../infrastructure/sqlite/database");',
      filename: "src/features/reels/presentation/controllers/use-reels.ts",
      errors: 1,
    },
    {
      code: "const dependency = import(moduleName);",
      filename: "src/features/reels/application/create-feed.ts",
      errors: [{ messageId: "dynamic" }],
    },
    {
      code: "const dependency = require(moduleName);",
      filename: "src/features/reels/application/create-feed.ts",
      errors: [{ messageId: "dynamic" }],
    },
  ],
});

javascriptTester.run("no-feature-root-imports", plugin.rules["no-feature-root-imports"], {
  valid: [
    {
      code: 'import { LearningScheduler } from "@/features/learning-engine/domain/learning-scheduler";',
    },
  ],
  invalid: [
    {
      code: 'import { LearningScheduler } from "@/features/learning-engine";',
      errors: 1,
    },
    {
      code: 'export * from "@/features/learning-engine";',
      errors: 1,
    },
  ],
});

javascriptTester.run(
  "no-engine-policy-in-presentation",
  plugin.rules["no-engine-policy-in-presentation"],
  {
    valid: [
      {
        code: "const threshold = 2;",
        filename: "src/features/reels/presentation/components/reel-feed.tsx",
      },
    ],
    invalid: [
      {
        code: 'import { FEED_ENGINE_CONFIG } from "@/features/reels/domain/feed-engine";',
        filename: "src/features/reels/presentation/hooks/use-reel-controller.ts",
        errors: 1,
      },
    ],
  }
);

javascriptTester.run(
  "no-persistence-orchestration-in-react-effect",
  plugin.rules["no-persistence-orchestration-in-react-effect"],
  {
    valid: [
      {
        code: "useEffect(() => controller.onOccurrenceBecameActive(item), [item]);",
        filename: "src/features/reels/presentation/components/reel-feed.tsx",
      },
    ],
    invalid: [
      {
        code: "useEffect(() => service.rateAttempt(id, level), [id, level]);",
        filename: "src/features/reels/presentation/components/reel-feed.tsx",
        errors: 1,
      },
    ],
  }
);

javascriptTester.run(
  "no-ui-index-as-domain-position",
  plugin.rules["no-ui-index-as-domain-position"],
  {
    valid: [
      {
        code: "studyService.startAttempt(card.id, occurrence.reelPosition, sessionId);",
        filename: "src/features/reels/presentation/components/reel-feed.tsx",
      },
    ],
    invalid: [
      {
        code: "studyService.startAttempt(card.id, activeIndex, sessionId);",
        filename: "src/features/reels/presentation/components/reel-feed.tsx",
        errors: 1,
      },
    ],
  }
);

javascriptTester.run("no-zod-in-domain", plugin.rules["no-zod-in-domain"], {
  valid: [
    {
      code: 'import { z } from "zod";',
      filename: "src/features/reels/contracts/feed-state.schema.ts",
    },
  ],
  invalid: [
    {
      code: 'import { z } from "zod";',
      filename: "src/features/study/domain/recall-level.ts",
      errors: 1,
    },
  ],
});

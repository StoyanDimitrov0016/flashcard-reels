const { RuleTester } = require("eslint");
const plugin = require("../index.js");

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: "module" } });

tester.run(
  "no-service-locator-in-presentation",
  plugin.rules["no-service-locator-in-presentation"],
  {
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
        code: "const services = useAppServices();",
        filename: "src/features/reels/presentation/hooks/use-reel-controller.ts",
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
    ],
  }
);

tester.run("no-engine-policy-in-presentation", plugin.rules["no-engine-policy-in-presentation"], {
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
});

tester.run(
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

tester.run("no-ui-index-as-domain-position", plugin.rules["no-ui-index-as-domain-position"], {
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
});

tester.run("no-zod-in-domain", plugin.rules["no-zod-in-domain"], {
  valid: [
    {
      code: 'import { z } from "zod";',
      filename: "src/features/reels/contracts/feed-strategy-state.schema.ts",
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

console.log("Flashcards architecture plugin RuleTester checks passed.");

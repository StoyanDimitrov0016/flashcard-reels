# Feature specs

A spec is written before a feature is built. It records what the feature is for, what it
deliberately leaves out, and when it is done. The owner decides the problem, the scope, the
hard-to-reverse decisions, and the time budget. Agents may draft the requirements and acceptance
checks, but the owner approves them.

Build one spec at a time. A spec changes at most one core decision, such as the deck format, the
learning history, or the study flow.

## Template

1. **Problem and value**: who has the problem, why it matters now, and which roadmap item it
   serves.
2. **Functional requirements**: what the learner or owner can do or see.
3. **Non-functional requirements**: only the qualities that matter for this feature, such as data
   safety, offline use, compatibility, performance, or privacy.
4. **Out of scope**: what this feature deliberately does not do.
5. **Hard-to-reverse decisions**: the choices the owner signs off before work starts.
6. **Acceptance**: the checks that close the feature.
7. **Time budget**: how much work the feature is worth. When the work does not fit, cut scope
   instead of extending the budget.
8. **Open questions**: the owner's decisions that are still pending.

## Specs

- [0 - Deck publish check](0-deck-publish-check.md)
- [1a - Study feeds with a For you and Focus header](1a-study-tab.md)
- [1b - Reading tab and lessons](1b-reading-tab.md)

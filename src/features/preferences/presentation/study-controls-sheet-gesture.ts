export const STUDY_CONTROLS_SHEET_DISMISS_DISTANCE = 96;
export const STUDY_CONTROLS_SHEET_FLICK_DISTANCE = 24;
export const STUDY_CONTROLS_SHEET_FLICK_VELOCITY = 0.6;

export function shouldDismissStudyControlsSheet(translationY: number, velocityY: number): boolean {
  return (
    translationY >= STUDY_CONTROLS_SHEET_DISMISS_DISTANCE ||
    (translationY >= STUDY_CONTROLS_SHEET_FLICK_DISTANCE &&
      velocityY >= STUDY_CONTROLS_SHEET_FLICK_VELOCITY)
  );
}

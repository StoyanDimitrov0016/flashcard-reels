export function getReelRotationValue(revealed: boolean): 0 | 1 {
  return revealed ? 1 : 0;
}

export function shouldSynchronizeReelRotation(
  occurrenceChanged: boolean,
  revealedChanged: boolean,
  animationTarget: boolean,
  revealed: boolean
): boolean {
  return occurrenceChanged || (revealedChanged && animationTarget !== revealed);
}

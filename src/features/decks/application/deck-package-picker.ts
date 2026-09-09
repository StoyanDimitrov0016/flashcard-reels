export type DeckPackageSelection = Readonly<{ uri: string }>;

export interface DeckPackagePicker {
  pick(): Promise<DeckPackageSelection | null>;
}

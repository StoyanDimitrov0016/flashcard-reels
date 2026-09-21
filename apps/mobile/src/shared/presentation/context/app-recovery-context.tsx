import { createContext, type ReactNode, useContext } from "react";

export type AppRecoveryCapability = Readonly<{
  requestAppDataReset: () => void;
}>;

const AppRecoveryContext = createContext<AppRecoveryCapability | null>(null);

type AppRecoveryProviderProps = Readonly<{
  capability: AppRecoveryCapability;
  children: ReactNode;
}>;

export function AppRecoveryProvider({ capability, children }: AppRecoveryProviderProps) {
  return <AppRecoveryContext.Provider value={capability}>{children}</AppRecoveryContext.Provider>;
}

export function useAppRecovery(): AppRecoveryCapability {
  const capability = useContext(AppRecoveryContext);
  if (!capability) {
    throw new Error("useAppRecovery requires AppRecoveryProvider");
  }
  return capability;
}

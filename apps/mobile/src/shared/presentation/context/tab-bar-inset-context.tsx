import { createContext, type ReactNode, useContext } from "react";

const TabBarInsetContext = createContext(0);

type TabBarInsetProviderProps = Readonly<{ children: ReactNode; inset: number }>;

/** Shares the floating tab bar's height with the screens it covers. */
export function TabBarInsetProvider({ children, inset }: TabBarInsetProviderProps) {
  return <TabBarInsetContext.Provider value={inset}>{children}</TabBarInsetContext.Provider>;
}

/**
 * Bottom space a screen must keep clear for the floating tab bar. Zero outside the tabs, such as
 * on pushed screens, so the same components work in both places.
 */
export function useTabBarInset(): number {
  return useContext(TabBarInsetContext);
}

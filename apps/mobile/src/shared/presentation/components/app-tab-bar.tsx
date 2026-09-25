import type { ComponentProps } from "react";

import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";

type AppTabIconName = ComponentProps<typeof SymbolView>["name"];

/** One bottom-bar item. Several routes can share an item, such as the two study feeds. */
export type AppTabItem = Readonly<{
  key: string;
  routeNames: readonly string[];
  icon: AppTabIconName;
  accessibilityLabel: string;
}>;

const ISLAND_HEIGHT = 60;
const ITEM_HEIGHT = 44;
const ISLAND_INSET = 16;
const ISLAND_GAP_ABOVE = 8;

function getIslandBottom(safeAreaBottom: number): number {
  return Math.max(safeAreaBottom, sizes.spacing.medium);
}

/** Space the island takes from the bottom of the screen, including the gap above it. */
export function useAppTabBarHeight(): number {
  const { bottom } = useSafeAreaInsets();
  return ISLAND_HEIGHT + ISLAND_GAP_ABOVE + getIslandBottom(bottom);
}

type AppTabBarProps = Readonly<{
  items: readonly AppTabItem[];
  activeRouteName: string;
  onSelect: (routeName: string) => void;
}>;

/**
 * The primary navigation as a floating island over the screens. Screens keep their content clear
 * of it with `useTabBarInset`, while their backgrounds run underneath.
 */
export function AppTabBar({ items, activeRouteName, onSelect }: AppTabBarProps) {
  const { colors } = useAppTheme();
  const { bottom } = useSafeAreaInsets();
  const styles = createStyles(colors);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.dock, { paddingBottom: getIslandBottom(bottom) }]}
    >
      <View accessibilityRole="tablist" style={styles.island}>
        {items.map((item) => {
          const active = item.routeNames.includes(activeRouteName);
          return (
            <Pressable
              accessibilityLabel={item.accessibilityLabel}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={item.key}
              onPress={() => onSelect(item.routeNames[0] ?? item.key)}
              style={styles.item}
            >
              <View style={styles.indicator}>
                {/* The pill never changes color, only opacity; Android drops the corner radius of a
                    view whose background changes after mount. */}
                <View style={[styles.pill, { opacity: active ? 1 : 0 }]} />
                <SymbolView
                  name={item.icon}
                  size={sizes.icon.medium}
                  tintColor={active ? colors.textPrimary : colors.textTertiary}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    dock: {
      bottom: 0,
      left: 0,
      paddingHorizontal: ISLAND_INSET,
      position: "absolute",
      right: 0,
    },
    indicator: { alignItems: "center", height: ITEM_HEIGHT, justifyContent: "center", width: 56 },
    pill: {
      backgroundColor: colors.surfaceHover,
      borderRadius: ITEM_HEIGHT / 2,
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    island: {
      alignItems: "center",
      alignSelf: "center",
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderSubtle,
      borderRadius: ISLAND_HEIGHT / 2,
      borderWidth: sizes.border,
      elevation: 6,
      flexDirection: "row",
      height: ISLAND_HEIGHT,
      maxWidth: 420,
      paddingHorizontal: sizes.spacing.small,
      shadowColor: "#000",
      shadowOffset: { height: 4, width: 0 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      width: "100%",
    },
    item: { alignItems: "center", flex: 1, height: ISLAND_HEIGHT, justifyContent: "center" },
  });
}

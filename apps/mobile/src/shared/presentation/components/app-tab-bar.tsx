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

const tabBarHeight = 52;

type AppTabBarProps = Readonly<{
  items: readonly AppTabItem[];
  activeRouteName: string;
  onSelect: (routeName: string) => void;
}>;

export function AppTabBar({ items, activeRouteName, onSelect }: AppTabBarProps) {
  const { colors } = useAppTheme();
  const { bottom } = useSafeAreaInsets();
  const styles = createStyles(colors);

  return (
    <View accessibilityRole="tablist" style={[styles.bar, { paddingBottom: bottom }]}>
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
            <SymbolView
              name={item.icon}
              size={sizes.icon.medium}
              tintColor={active ? colors.actionPrimary : colors.textTertiary}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    bar: {
      backgroundColor: colors.navigation,
      borderTopColor: colors.borderSubtle,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
    },
    item: {
      alignItems: "center",
      flex: 1,
      height: tabBarHeight,
      justifyContent: "center",
    },
  });
}

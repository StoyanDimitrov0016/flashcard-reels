import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize } from "@/shared/presentation/typography";

type SearchFieldProps = Readonly<{
  accessibilityLabel: string;
  /** Spoken label for the clear button, such as "Clear deck search". */
  clearLabel: string;
  onChangeText: (query: string) => void;
  placeholder: string;
  value: string;
}>;

export function SearchField({
  accessibilityLabel,
  clearLabel,
  onChangeText,
  placeholder,
  value,
}: SearchFieldProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.shell}>
      <SymbolView
        name={{ android: "search", ios: "magnifyingglass", web: "search" }}
        size={sizes.icon.small}
        tintColor={colors.textTertiary}
      />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        returnKeyType="search"
        style={styles.input}
        value={value}
      />
      {!!value && (
        <Pressable
          accessibilityLabel={clearLabel}
          accessibilityRole="button"
          onPress={() => onChangeText("")}
          style={styles.clear}
        >
          <SymbolView
            name={{ android: "cancel", ios: "xmark.circle.fill", web: "cancel" }}
            size={sizes.icon.small}
            tintColor={colors.textTertiary}
          />
        </Pressable>
      )}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    clear: {
      alignItems: "center",
      height: sizes.touchTarget.minimum,
      justifyContent: "center",
      width: sizes.touchTarget.minimum,
    },
    input: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: fontSize.callout,
      height: sizes.input.standard,
    },
    shell: {
      alignItems: "center",
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderSubtle,
      borderRadius: sizes.radius.row,
      borderWidth: sizes.border,
      flexDirection: "row",
      gap: sizes.spacing.medium,
      paddingLeft: sizes.spacing.section,
    },
  });
}

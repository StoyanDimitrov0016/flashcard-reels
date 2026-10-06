import { useState, type ReactNode } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Renderer, useMarkdown, type MarkedStyles } from "react-native-marked";

import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

const monospaceFamily = Platform.select({ android: "monospace", default: "Menlo" });

class LessonRenderer extends Renderer {
  override code(
    text: string,
    _language?: string,
    containerStyle?: ViewStyle,
    textStyle?: TextStyle
  ): ReactNode {
    return (
      <ScrollView
        key={this.getKey()}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={containerStyle}
        contentContainerStyle={codeStyles.content}
      >
        <Text selectable style={textStyle}>
          {text}
        </Text>
      </ScrollView>
    );
  }
}

type LessonMarkdownProps = Readonly<{ body: string }>;

/** This module is the only native Markdown renderer boundary. Content is already validated. */
export function LessonMarkdown({ body }: LessonMarkdownProps) {
  const { colors, resolvedScheme } = useAppTheme();
  const [renderer] = useState(() => new LessonRenderer());
  const styles = createStyles(colors);
  const theme = {
    colors: {
      text: colors.textPrimary,
      code: colors.codeSurface,
      link: colors.textPrimary,
      border: colors.borderSubtle,
    },
    spacing: {
      xs: sizes.spacing.small,
      s: sizes.spacing.medium,
      m: sizes.spacing.medium,
      l: sizes.spacing.section,
    },
  };
  const elements = useMarkdown(body, { renderer, styles, theme, colorScheme: resolvedScheme });

  return elements;
}

const codeStyles = StyleSheet.create({ content: { padding: sizes.spacing.section } });

function createStyles(colors: AppColors): MarkedStyles {
  const text: TextStyle = {
    color: colors.textPrimary,
    fontSize: fontSize.reading,
    lineHeight: lineHeight.reading,
  };
  return {
    text,
    strong: { ...text, fontWeight: fontWeight.bold },
    em: { ...text, fontStyle: "italic" },
    paragraph: { paddingVertical: sizes.spacing.medium },
    li: text,
    list: { paddingVertical: sizes.spacing.medium },
    codespan: {
      color: colors.codeText,
      backgroundColor: colors.codeSurface,
      fontFamily: monospaceFamily,
      fontSize: fontSize.bodyLarge,
      lineHeight: lineHeight.reading,
    },
    code: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: sizes.radius.medium,
      padding: 0,
      marginVertical: sizes.spacing.medium,
      flexGrow: 0,
    },
    codeText: {
      color: colors.textPrimary,
      fontFamily: monospaceFamily,
      fontSize: fontSize.footnote,
      lineHeight: lineHeight.body,
    },
  };
}

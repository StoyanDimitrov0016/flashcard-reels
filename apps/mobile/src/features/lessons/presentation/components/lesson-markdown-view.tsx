import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import type { LessonBlock, LessonInline } from "@/features/lessons/domain/lesson-markdown.parser";

import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

const monospaceFamily = Platform.select({ android: "monospace", default: "Menlo" });
const listMarkerWidth = 26;

type LessonMarkdownViewProps = Readonly<{ blocks: readonly LessonBlock[] }>;

export function LessonMarkdownView({ blocks }: LessonMarkdownViewProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.document}>
      {blocks.map((block, index) => (
        // Blocks have no identity beyond their position in an immutable lesson.
        // oxlint-disable-next-line react/no-array-index-key
        <LessonBlockView block={block} colors={colors} key={index} />
      ))}
    </View>
  );
}

type LessonBlockViewProps = Readonly<{ block: LessonBlock; colors: AppColors }>;

function LessonBlockView({ block, colors }: LessonBlockViewProps) {
  const styles = createStyles(colors);

  if (block.type === "heading") {
    const headingStyle = [styles.heading1, styles.heading2, styles.heading3][block.level - 1];
    return (
      <Text accessibilityRole="header" style={[styles.heading, headingStyle]}>
        <InlineText colors={colors} content={block.content} />
      </Text>
    );
  }
  if (block.type === "paragraph") {
    return (
      <Text style={styles.paragraph}>
        <InlineText colors={colors} content={block.content} />
      </Text>
    );
  }
  if (block.type === "list") {
    return (
      <View accessibilityRole="list" style={styles.list}>
        {block.items.map((item, index) => (
          // oxlint-disable-next-line react/no-array-index-key
          <View key={index} style={styles.listItem}>
            <Text style={styles.listMarker}>{block.ordered ? `${block.start + index}.` : "•"}</Text>
            <Text style={styles.listText}>
              <InlineText colors={colors} content={item} />
            </Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.codeBlockContent}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.codeBlock}
    >
      <Text selectable style={styles.codeBlockText}>
        {block.text}
      </Text>
    </ScrollView>
  );
}

type InlineTextProps = Readonly<{ colors: AppColors; content: readonly LessonInline[] }>;

function InlineText({ colors, content }: InlineTextProps) {
  const styles = createStyles(colors);

  return content.map((segment, index) => (
    <Text
      // oxlint-disable-next-line react/no-array-index-key
      key={index}
      style={[
        segment.bold && styles.bold,
        segment.italic && styles.italic,
        segment.code && styles.inlineCode,
      ]}
    >
      {segment.text}
    </Text>
  ));
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    bold: { fontWeight: fontWeight.bold },
    codeBlock: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: sizes.radius.medium,
      flexGrow: 0,
    },
    codeBlockContent: { padding: sizes.spacing.section },
    codeBlockText: {
      color: colors.textPrimary,
      fontFamily: monospaceFamily,
      fontSize: fontSize.footnote,
      lineHeight: lineHeight.body,
    },
    document: { gap: sizes.spacing.section },
    heading: { color: colors.textPrimary, fontWeight: fontWeight.bold },
    heading1: {
      fontSize: fontSize.title1,
      lineHeight: lineHeight.title1,
      marginTop: sizes.spacing.content,
    },
    heading2: {
      fontSize: fontSize.title2,
      lineHeight: lineHeight.title2,
      marginTop: sizes.spacing.section,
    },
    heading3: {
      fontSize: fontSize.subhead,
      lineHeight: lineHeight.subhead,
      marginTop: sizes.spacing.medium,
    },
    inlineCode: {
      backgroundColor: colors.codeSurface,
      color: colors.codeText,
      fontFamily: monospaceFamily,
      fontSize: fontSize.bodyLarge,
    },
    italic: { fontStyle: "italic" },
    list: { gap: sizes.spacing.medium },
    listItem: { flexDirection: "row" },
    listMarker: {
      color: colors.textSecondary,
      fontSize: fontSize.reading,
      fontVariant: ["tabular-nums"],
      lineHeight: lineHeight.reading,
      width: listMarkerWidth,
    },
    listText: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: fontSize.reading,
      lineHeight: lineHeight.reading,
    },
    paragraph: {
      color: colors.textPrimary,
      fontSize: fontSize.reading,
      lineHeight: lineHeight.reading,
    },
  });
}

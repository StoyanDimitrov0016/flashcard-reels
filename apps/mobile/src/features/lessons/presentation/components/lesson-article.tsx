import { useCallback } from "react";
import { View, type LayoutChangeEvent } from "react-native";

import type { Lesson } from "@/features/lessons/domain/lesson.model";

import { LessonMarkdown } from "@/features/lessons/presentation/components/lesson-markdown";
import LessonSectionView from "@/features/lessons/presentation/components/lesson-section-view";

type LessonArticleProps = Readonly<{
  lesson: Lesson;
  targetSectionId?: string | null;
  sectionColor?: string;
  onTargetLayout?: (y: number) => void;
  onDocumentLayout?: (y: number) => void;
}>;

export function LessonArticle({
  lesson,
  targetSectionId,
  sectionColor,
  onTargetLayout,
  onDocumentLayout,
}: LessonArticleProps) {
  const handleTargetLayout = useCallback(
    (event: LayoutChangeEvent) => onTargetLayout?.(event.nativeEvent.layout.y),
    [onTargetLayout]
  );
  const handleDocumentLayout = useCallback(
    (event: LayoutChangeEvent) => onDocumentLayout?.(event.nativeEvent.layout.y),
    [onDocumentLayout]
  );

  return (
    <View onLayout={onDocumentLayout ? handleDocumentLayout : undefined}>
      {lesson.intro !== null && <LessonMarkdown body={lesson.intro} />}
      {lesson.sections.map((section) => (
        <LessonSectionView
          key={section.id}
          section={section}
          highlighted={section.id === targetSectionId}
          sectionColor={sectionColor}
          onLayout={section.id === targetSectionId ? handleTargetLayout : undefined}
        />
      ))}
    </View>
  );
}

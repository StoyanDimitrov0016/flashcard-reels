import type { ErrorBoundaryProps as ExpoErrorBoundaryProps } from "expo-router";

import LessonScreen from "@/features/lessons/presentation/screens/lesson-screen";
import { ViewErrorBoundary } from "@/shared/presentation/components/view-error-boundary";

type ErrorBoundaryProps = Readonly<ExpoErrorBoundaryProps>;

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <ViewErrorBoundary error={error} retry={retry} />;
}

export default LessonScreen;

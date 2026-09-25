"use client";

import { ErrorPanel } from "@/components/error-panel";

type PortalErrorProps = Readonly<{
  error: Error & { digest?: string };
  retry: () => void;
}>;

export default function PortalError({ error, retry }: PortalErrorProps) {
  return (
    <ErrorPanel
      description="The deck library could not be loaded. This is usually temporary."
      digest={error.digest}
      onRetry={retry}
      title="Something went wrong"
    />
  );
}

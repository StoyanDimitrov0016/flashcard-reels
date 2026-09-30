import { useEffect, useRef, useState } from "react";

const PROGRESS_IDLE_DELAY_MS = 1_000;

/** Show progress for a finger-driven scroll, through momentum and briefly after it stops. */
export function useReadingProgressVisibility() {
  const [visible, setVisible] = useState(false);
  const interacting = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelHide() {
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }

  function hideAfterIdle() {
    if (!interacting.current) {
      return;
    }
    cancelHide();
    hideTimer.current = setTimeout(function hideIdleProgress() {
      hideTimer.current = null;
      interacting.current = false;
      setVisible(false);
    }, PROGRESS_IDLE_DELAY_MS);
  }

  useEffect(function cleanUpProgressTimer() {
    return function cancelPendingProgressHide() {
      if (hideTimer.current !== null) {
        clearTimeout(hideTimer.current);
      }
    };
  }, []);

  return {
    visible,
    scrollViewProps: {
      onScrollBeginDrag: () => {
        cancelHide();
        interacting.current = true;
        setVisible(true);
      },
      onScrollEndDrag: hideAfterIdle,
      onMomentumScrollBegin: () => {
        if (interacting.current) {
          cancelHide();
        }
      },
      onMomentumScrollEnd: hideAfterIdle,
    },
  };
}

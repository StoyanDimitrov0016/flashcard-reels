import { useEffect, useRef } from "react";

type HotkeyHandlers = Readonly<Record<string, (event: KeyboardEvent) => void>>;

const ActivationKeys = new Set([" ", "Enter"]);

function isTypingTarget(target: HTMLElement): boolean {
  return target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName);
}

function shouldIgnore(event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return true;
  }
  const { target } = event;
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    isTypingTarget(target) ||
    // Page shortcuts pause while a dialog is open.
    target.closest('[role="dialog"], [role="alertdialog"]') !== null ||
    // Space and Enter keep activating the focused link or button.
    (ActivationKeys.has(event.key) &&
      target.closest('a[href], button, summary, [role="button"], [role="link"]') !== null)
  );
}

/**
 * Listens for single-key shortcuts, keyed by `KeyboardEvent.key`, while the component is mounted.
 * Keys typed into form fields, keys pressed inside dialogs, chords with modifier keys, and
 * Space/Enter on a focused control are left to the browser.
 */
export function useHotkeys(handlers: HotkeyHandlers): void {
  const handlersRef = useRef(handlers);

  useEffect(
    function keepLatestHandlers() {
      handlersRef.current = handlers;
    },
    [handlers]
  );

  useEffect(function listenForHotkeys() {
    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnore(event)) {
        return;
      }
      const handler = handlersRef.current[event.key];
      if (handler) {
        event.preventDefault();
        handler(event);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return function stopListeningForHotkeys() {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);
}

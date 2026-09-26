import * as SplashScreen from "expo-splash-screen";

// Keeps the native splash (the logo on the app canvas) up until the first real screen is ready,
// so startup never flashes a loading screen or its recovery controls.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

let revealed = false;

/** Hides the native splash. Safe to call more than once. */
export function revealApp(): void {
  if (revealed) {
    return;
  }
  revealed = true;
  SplashScreen.hide();
}

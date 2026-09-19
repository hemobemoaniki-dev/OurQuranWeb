// Applies the user's saved theme choice (account.settings.theme) to the app.
// Light is the default; "system" follows the device.
import { useEffect } from "react";

import { useAccount } from "@/src/context/AppState";
import { setColorScheme } from "@/src/theme";

export function ThemeApplier() {
  const { account, hydrated } = useAccount();
  const theme = account.settings.theme;

  useEffect(() => {
    if (!hydrated) return;
    if (theme === "system") setColorScheme(null);
    else setColorScheme(theme);
  }, [theme, hydrated]);

  return null;
}

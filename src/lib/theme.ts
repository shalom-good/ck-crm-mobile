import { useEffect, useState } from "react";

export type ThemePref = "system" | "light" | "dark";

const KEY = "ck-theme";

function apply(_pref: ThemePref) {
  // Dark mode is intentionally disabled — the app is light-only.
  document.documentElement.classList.remove("dark");
  document.documentElement.classList.add("light");
}

/** Light-only: ignore any saved preference or system setting; always light. */
export function initTheme() {
  apply("light");
}

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(
    () => (localStorage.getItem(KEY) as ThemePref) || "system",
  );
  useEffect(() => {
    localStorage.setItem(KEY, pref);
    apply(pref);
  }, [pref]);
  return { pref, setPref };
}

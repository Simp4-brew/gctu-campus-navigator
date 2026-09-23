import { useCallback, useEffect, useState } from "react";

import { storage } from "../lib/storage.js";

const THEME_KEY = "gctu-theme";

function initialTheme() {
  const saved = storage.get(THEME_KEY);

  if (saved === "light" || saved === "dark") {
    return saved;
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/* Light/dark theme: saved preference, else the OS setting. Applied as a
   `dark` class on <body>, which switches the CSS variables. */
export function useTheme() {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
    storage.set(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    [],
  );

  return { theme, toggleTheme };
}

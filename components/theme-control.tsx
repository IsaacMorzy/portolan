"use client";

import { useState } from "react";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeControl({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  // One binary choice, so one control. Three radios for "light or dark" made the
  // reader parse a menu to answer a yes/no question.
  const next: Theme = theme === "dark" ? "light" : "dark";
  const label = next === "dark" ? "Switch to dark theme" : "Switch to light theme";

  return (
    <button
      type="button"
      onClick={() => choose(next)}
      aria-label={label}
      title={label}
      aria-pressed={theme === "dark"}
      className="flex size-7 items-center justify-center rounded text-fg hover:bg-raised"
    >
      {/* Drawn, not typed: an emoji here would take its colour from the platform
          and break the token palette in dark mode. */}
      {theme === "dark" ? (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="8" cy="8" r="3.1" />
          <path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3.05 3.05l1.13 1.13M11.82 11.82l1.13 1.13M12.95 3.05l-1.13 1.13M4.18 11.82l-1.13 1.13" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8Z" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

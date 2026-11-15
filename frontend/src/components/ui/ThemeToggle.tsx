/** Versatile theme switcher button with contextual help popover. */

import { Eye, Moon, Sun } from "lucide-react";
import { APP_THEMES, useUiStore, type AppTheme } from "../../state";
import { HelpPopover } from "./HelpPopover";

function ThemeIcon({ theme }: { theme: AppTheme }) {
  if (theme === "daylight") {
    return <Sun size={14} aria-hidden="true" />;
  }
  if (theme === "orbital") {
    return <Moon size={14} aria-hidden="true" />;
  }
  return <Eye size={14} aria-hidden="true" />;
}

export function ThemeToggle() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  return (
    <div className="control-with-help">
      <div className="theme-segmented" role="group" aria-label="Workspace theme">
        {APP_THEMES.map((option) => {
          const active = theme === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className={`theme-pill ${active ? "active" : ""}`}
              aria-pressed={active}
              title={option.description}
              onClick={() => setTheme(option.id)}
            >
              <ThemeIcon theme={option.id} />
              <span>{option.shortLabel}</span>
            </button>
          );
        })}
      </div>
      <HelpPopover helpKey="themeToggle" />
    </div>
  );
}

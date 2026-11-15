/** Compact audience mode toggle (Planner vs. Explorer) with contextual instruction popover (F3.6). */

import { Compass, GraduationCap } from "lucide-react";
import { HelpPopover } from "../../components/ui";
import { useMissionStore } from "../../state";

export function ModeSwitchPill() {
  const personaMode = useMissionStore((s) => s.personaMode);
  const setPersonaMode = useMissionStore((s) => s.setPersonaMode);

  return (
    <div className="control-with-help">
      <div className="theme-segmented" role="group" aria-label="Audience mode">
        {(["planner", "explorer"] as const).map((mode) => {
          const active = personaMode === mode;
          const Icon = mode === "planner" ? Compass : GraduationCap;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setPersonaMode(mode)}
              aria-pressed={active}
              className={`theme-pill ${active ? "active" : ""}`}
            >
              <Icon size={13} aria-hidden="true" />
              <span>{mode === "planner" ? "Planner" : "Explorer"}</span>
            </button>
          );
        })}
      </div>
      <HelpPopover helpKey="modeSwitch" />
    </div>
  );
}

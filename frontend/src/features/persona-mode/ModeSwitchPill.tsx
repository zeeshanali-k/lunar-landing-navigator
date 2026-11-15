/** Global segmented audience mode toggle (Mission Planner vs. Explorer) & Challenges shortcut (F3.6). */

import { Compass, GraduationCap, Sparkles } from "lucide-react";
import { useMissionStore } from "../../state";

export function ModeSwitchPill() {
  const personaMode = useMissionStore((s) => s.personaMode);
  const setPersonaMode = useMissionStore((s) => s.setPersonaMode);
  const activeTab = useMissionStore((s) => s.activeTab);
  const setActiveTab = useMissionStore((s) => s.setActiveTab);

  const isExplorerTab = activeTab === "explorer";
  const handleChallengeShortcut = (): void => {
    setPersonaMode("explorer");
    setActiveTab(isExplorerTab ? "cockpit" : "explorer");
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
      <div
        role="group"
        aria-label="Audience mode"
        style={{ display: "inline-flex", padding: "0.18rem", borderRadius: "0.5rem", border: "1px solid var(--border-subtle)", background: "var(--bg-space)" }}
      >
        {(["planner", "explorer"] as const).map((mode) => {
          const active = personaMode === mode;
          const Icon = mode === "planner" ? Compass : GraduationCap;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setPersonaMode(mode)}
              aria-pressed={active}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.28rem 0.65rem",
                borderRadius: "0.35rem",
                border: "none",
                cursor: "pointer",
                fontSize: "0.78rem",
                fontWeight: 600,
                background: active ? (mode === "explorer" ? "var(--accent-sun)" : "var(--accent-dte)") : "transparent",
                color: active ? "#070b14" : "var(--text-muted)",
              }}
            >
              <Icon size={13} />
              {mode === "planner" ? "Mission Planner" : "Explorer"}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleChallengeShortcut}
        className={`category-pill ${isExplorerTab ? "active" : ""}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.3rem",
          padding: "0.32rem 0.65rem",
          borderColor: isExplorerTab ? "var(--accent-sun)" : "rgba(245, 158, 11, 0.4)",
          background: isExplorerTab ? "rgba(245, 158, 11, 0.2)" : "var(--bg-panel-elevated)",
          color: "#fcd34d",
        }}
        title={isExplorerTab ? "Return to Mission Cockpit" : "Open 3 Guided Mission Detective Challenges"}
      >
        <Sparkles size={12} />
        {isExplorerTab ? "Back to Cockpit" : "Detective Challenges (3)"}
      </button>
    </div>
  );
}

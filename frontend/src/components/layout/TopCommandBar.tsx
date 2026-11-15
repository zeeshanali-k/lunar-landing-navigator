/** Aerospace command-center top navigation bar with mode toggle and shareable URL sync (F3.1). */

import { useState } from "react";
import {
  CalendarSearch,
  Check,
  Compass,
  GitCompare,
  GraduationCap,
  Link2,
  Moon,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  copyScenarioLinkToClipboard,
  useComparisonStore,
  useMissionStore,
  type WorkspaceTab,
} from "../../state";
import { ModeSwitchPill } from "../../features/persona-mode";

const WORKSPACE_TABS: { id: WorkspaceTab; label: string; icon: typeof Compass }[] = [
  { id: "cockpit", label: "Mission Cockpit", icon: Compass },
  { id: "compare", label: "Compare Scenarios", icon: GitCompare },
  { id: "windows", label: "Landing Window Finder", icon: CalendarSearch },
  { id: "explorer", label: "Explorer Guide", icon: GraduationCap },
];

export function TopCommandBar() {
  const [copied, setCopied] = useState(false);

  const activeTab = useMissionStore((s) => s.activeTab);
  const setActiveTab = useMissionStore((s) => s.setActiveTab);
  const isOfflineFallback = useMissionStore((s) => s.isOfflineFallback);
  const evaluationData = useMissionStore((s) => s.evaluationData);
  const selectedSite = useMissionStore((s) => s.selectedSite);
  const customCoords = useMissionStore((s) => s.customCoords);
  const getScenarioUrlParams = useMissionStore((s) => s.getScenarioUrlParams);

  const pinnedCount = useComparisonStore((s) => s.pinnedScenarios.length);

  const activeSiteTitle = customCoords
    ? `${customCoords.label || "Custom Pin"} (${customCoords.lat_deg.toFixed(2)}°, ${customCoords.lon_deg.toFixed(2)}°)`
    : (selectedSite?.name ?? evaluationData?.site.name ?? "Loading site...");

  const handleCopyLink = async (): Promise<void> => {
    const ok = await copyScenarioLinkToClipboard(getScenarioUrlParams());
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="top-command-bar">
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Moon size={24} color="var(--accent-sun)" />
        <div>
          <div style={{ fontWeight: 700, fontSize: "1rem", lineHeight: 1.2 }}>
            Lunar Landing Site Navigator
          </div>
          <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
            {activeSiteTitle}
          </div>
        </div>
      </div>

      <nav className="nav-tabs" aria-label="Workspace navigation">
        {WORKSPACE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`nav-tab ${isActive ? "active" : ""}`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              {tab.id === "compare" && pinnedCount > 0 && (
                <span
                  style={{
                    padding: "0.05rem 0.4rem",
                    borderRadius: "999px",
                    fontSize: "0.72rem",
                    background: "var(--accent-dte)",
                    color: "#070b14",
                    fontWeight: 700,
                  }}
                >
                  {pinnedCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
        <ModeSwitchPill />

        <span
          className="status-pill"
          style={{ color: isOfflineFallback ? "var(--accent-sun)" : "var(--accent-ok)" }}
        >
          {isOfflineFallback ? <WifiOff size={13} /> : <Wifi size={13} />}
          {isOfflineFallback ? "OFFLINE FIXTURE" : "LIVE API"}
        </span>

        <button type="button" onClick={() => void handleCopyLink()} className="btn-surface">
          {copied ? <Check size={14} color="var(--accent-ok)" /> : <Link2 size={14} />}
          <span>{copied ? "Scenario Link Copied!" : "Copy Scenario Link"}</span>
        </button>
      </div>
    </header>
  );
}

/** Top navigation header with screen tabs, versatile theme toggle, and share/export popups. */

import { useState } from "react";
import { CalendarSearch, Check, Compass, Download, GitCompare, GraduationCap, Link2, Map, Moon, Sun, Wifi, WifiOff } from "lucide-react";
import { copyScenarioLinkToClipboard, useComparisonStore, useMissionStore, type WorkspaceTab } from "../../state";
import { MissionBriefingModal } from "../../features/briefing-export";
import { ModeSwitchPill } from "../../features/persona-mode";
import { HelpPopover, ThemeToggle } from "../ui";
import { WORKSPACE_SCREENS } from "./navigationConfig";

const SCREEN_ICONS: Record<WorkspaceTab, typeof Compass> = {
  cockpit: Compass,
  terrain: Map,
  sky: Sun,
  compare: GitCompare,
  windows: CalendarSearch,
  explorer: GraduationCap,
};

export function TopCommandBar() {
  const [copied, setCopied] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);

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
    <>
      <header className="top-command-bar">
        <div className="top-bar-primary">
          <div className="brand-lockup">
            <div className="brand-badge">
              <Moon size={20} color="var(--accent-sun)" aria-hidden="true" />
            </div>
            <div>
              <div className="brand-title">Lunar Landing Site Navigator</div>
              <div className="brand-subtitle">{activeSiteTitle}</div>
            </div>
          </div>

          <div className="top-bar-actions">
            <ThemeToggle />
            <ModeSwitchPill />

            <span className="status-pill" style={{ color: isOfflineFallback ? "var(--accent-sun)" : "var(--accent-ok)" }}>
              {isOfflineFallback ? <WifiOff size={13} aria-hidden="true" /> : <Wifi size={13} aria-hidden="true" />}
              <span>{isOfflineFallback ? "Offline Sample" : "Live API"}</span>
            </span>

            <div className="control-with-help">
              <button type="button" onClick={() => void handleCopyLink()} className="btn-surface">
                {copied ? <Check size={14} color="var(--accent-ok)" /> : <Link2 size={14} />}
                <span>{copied ? "Copied!" : "Copy Link"}</span>
              </button>
              <HelpPopover helpKey="copyLinkBtn" />
            </div>

            <div className="control-with-help">
              <button type="button" onClick={() => setBriefingOpen(true)} className="btn-primary">
                <Download size={14} />
                <span>Export</span>
              </button>
              <HelpPopover helpKey="exportBriefingBtn" />
            </div>
          </div>
        </div>

        <nav className="nav-tabs" aria-label="Workspace screens">
          {WORKSPACE_SCREENS.map((screen) => {
            const Icon = SCREEN_ICONS[screen.id] ?? Compass;
            const isActive = activeTab === screen.id;
            return (
              <button
                key={screen.id}
                type="button"
                onClick={() => setActiveTab(screen.id)}
                className={`nav-tab ${isActive ? "active" : ""}`}
                title={screen.shortDescription}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{screen.label}</span>
                {screen.id === "compare" && pinnedCount > 0 && <span className="nav-count-badge">{pinnedCount}</span>}
              </button>
            );
          })}
        </nav>
      </header>

      <MissionBriefingModal open={briefingOpen} onClose={() => setBriefingOpen(false)} />
    </>
  );
}

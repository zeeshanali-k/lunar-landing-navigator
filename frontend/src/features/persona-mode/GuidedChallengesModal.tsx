/** Explorer "Why Does This Happen?" Cockpit Banner and 3 Guided Mission Detective Challenges (F3.6). */

import { useState, type CSSProperties } from "react";
import { ArrowRight, BookOpen, Eye, HelpCircle, Lightbulb, Rocket, Sparkles } from "lucide-react";
import { useMissionStore, usePlaybackStore } from "../../state";
import { EDUCATIONAL_CALLOUTS, MISSION_CHALLENGES, getLiveExplorerInsight, type MissionChallenge } from "./educationalGlossary";

const CALLOUT_BOX: CSSProperties = {
  padding: "0.7rem 0.85rem",
  borderRadius: "0.55rem",
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-panel-elevated)",
  display: "flex",
  flexDirection: "column",
  gap: "0.45rem",
};

export function ExplorerCalloutBanner() {
  const personaMode = useMissionStore((s) => s.personaMode);
  const evaluationData = useMissionStore((s) => s.evaluationData);
  const selectedSite = useMissionStore((s) => s.selectedSite);
  const customCoords = useMissionStore((s) => s.customCoords);
  const solarArrayType = useMissionStore((s) => s.solarArrayType);
  const setActiveTab = useMissionStore((s) => s.setActiveTab);
  const currentIndex = usePlaybackStore((s) => s.currentIndex);

  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);

  if (personaMode !== "explorer") return null;

  const siteName = customCoords?.label || selectedSite?.name || evaluationData?.site.name || "Selected landing site";
  const pt = evaluationData?.timeseries[currentIndex] ?? null;
  const liveInsight = getLiveExplorerInsight(siteName, pt?.is_sunlit ?? true, pt?.is_dte_visible ?? false, solarArrayType);
  const activeTopic = EDUCATIONAL_CALLOUTS.find((item) => item.id === activeTopicId) ?? null;

  return (
    <section
      className="panel-card"
      aria-label="Explorer Educational Callout"
      style={{
        borderColor: "rgba(245, 158, 11, 0.45)",
        background: "rgba(245, 158, 11, 0.06)",
        gap: "0.85rem",
        padding: "1rem 1.15rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", flex: "1 1 360px", maxWidth: "920px" }}>
          <Lightbulb size={18} color="var(--accent-sun)" style={{ flexShrink: 0, marginTop: "0.15rem" }} />
          <div>
            <div
              style={{
                fontSize: "0.74rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "#fcd34d",
              }}
            >
              Explorer Mode — Why Does This Happen?
            </div>
            <div style={{ fontSize: "0.86rem", color: "var(--text-primary)", marginTop: "0.25rem", lineHeight: 1.5 }}>{liveInsight}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab("explorer")}
          className="btn-surface"
          style={{ borderColor: "rgba(245, 158, 11, 0.45)", color: "#fcd34d", flexShrink: 0 }}
        >
          <Sparkles size={13} /> Open 3 Detective Challenges <ArrowRight size={13} />
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", paddingTop: "0.15rem", alignItems: "center" }}>
        {EDUCATIONAL_CALLOUTS.map((topic) => {
          const isOpen = activeTopicId === topic.id;
          return (
            <button
              key={topic.id}
              type="button"
              onClick={() => setActiveTopicId(isOpen ? null : topic.id)}
              className={`category-pill ${isOpen ? "active" : ""}`}
            >
              {topic.title}
            </button>
          );
        })}
      </div>

      {activeTopic && (
        <div style={{ ...CALLOUT_BOX, borderColor: "rgba(56, 189, 248, 0.35)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "0.5rem",
              fontSize: "0.84rem",
              fontWeight: 700,
            }}
          >
            <span>{activeTopic.title}</span>
            <span style={{ fontSize: "0.7rem", color: "var(--accent-dte)" }}>{activeTopic.tag}</span>
          </div>
          <p style={{ margin: 0, fontSize: "0.83rem", color: "var(--text-primary)", lineHeight: 1.45 }}>{activeTopic.whyItHappens}</p>
          <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{activeTopic.plannerMetricNote}</span>
        </div>
      )}
    </section>
  );
}

export function GuidedChallengesView() {
  const selectSite = useMissionStore((s) => s.selectSite);
  const setHardwareConfig = useMissionStore((s) => s.setHardwareConfig);
  const setPersonaMode = useMissionStore((s) => s.setPersonaMode);
  const setActiveTab = useMissionStore((s) => s.setActiveTab);

  const [revealed, setRevealed] = useState<Record<string, "hint" | "answer" | undefined>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const launchChallengeScenario = async (challenge: MissionChallenge): Promise<void> => {
    setLoadingId(challenge.id);
    await selectSite(challenge.siteId);
    await setHardwareConfig(challenge.solarArrayType, challenge.observerHeightM);
    setPersonaMode("explorer");
    setLoadingId(null);
    setActiveTab("cockpit");
  };

  const toggleReveal = (id: string, kind: "hint" | "answer"): void => {
    setRevealed((prev) => ({ ...prev, [id]: prev[id] === kind ? undefined : kind }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <section className="panel-card">
        <h2 className="panel-title">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <Rocket size={14} color="var(--accent-sun)" /> Guided Mission Detective Challenges (3)
          </span>
          <span style={{ fontSize: "0.74rem", fontWeight: 500, color: "var(--text-muted)", textTransform: "none" }}>
            Launch real NASA &amp; international lunar scenarios in the Cockpit to investigate each mystery
          </span>
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.75rem" }}>
          {MISSION_CHALLENGES.map((c) => {
            const state = revealed[c.id];
            return (
              <div key={c.id} style={CALLOUT_BOX}>
                <div
                  style={{
                    fontSize: "0.73rem",
                    fontWeight: 700,
                    color: "var(--accent-sun)",
                    textTransform: "uppercase",
                  }}
                >
                  {c.title}
                </div>
                <div style={{ fontSize: "0.94rem", fontWeight: 700, color: "var(--text-primary)" }}>{c.question}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.2rem" }}>
                  <button
                    type="button"
                    onClick={() => void launchChallengeScenario(c)}
                    disabled={loadingId === c.id}
                    className="btn-surface"
                    style={{ borderColor: "var(--accent-dte)" }}
                  >
                    <Rocket size={12} />
                    {loadingId === c.id ? "Loading..." : "Try Scenario in Cockpit ↗"}
                  </button>
                  <button type="button" onClick={() => toggleReveal(c.id, "hint")} className="category-pill">
                    <HelpCircle size={11} style={{ marginRight: "0.25rem", verticalAlign: "-1px" }} />
                    {state === "hint" ? "Hide Hint" : "Show Hint"}
                  </button>
                  <button type="button" onClick={() => toggleReveal(c.id, "answer")} className="category-pill">
                    <Eye size={11} style={{ marginRight: "0.25rem", verticalAlign: "-1px" }} />
                    {state === "answer" ? "Hide Answer" : "Reveal Answer"}
                  </button>
                </div>
                {state === "hint" && (
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.82rem", color: "#fcd34d", lineHeight: 1.45 }}>
                    <strong>Hint:</strong> {c.hint}
                  </p>
                )}
                {state === "answer" && (
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.82rem", color: "#6ee7b7", lineHeight: 1.45 }}>
                    <strong>Answer:</strong> {c.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel-card">
        <h2 className="panel-title">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <BookOpen size={14} color="var(--accent-dte)" /> Why Does This Happen? — Polar Physics &amp; Artemis Partners
          </span>
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "0.75rem" }}>
          {EDUCATIONAL_CALLOUTS.map((topic) => (
            <div key={topic.id} style={CALLOUT_BOX}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                <strong style={{ fontSize: "0.9rem" }}>{topic.title}</strong>
                <span className="status-pill" style={{ fontSize: "0.68rem", padding: "0.15rem 0.5rem", color: "var(--accent-dte)" }}>
                  {topic.tag}
                </span>
              </div>
              <div style={{ fontSize: "0.82rem", color: "#fcd34d", fontWeight: 500 }}>{topic.summary}</div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-primary)", lineHeight: 1.45 }}>{topic.whyItHappens}</p>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  borderTop: "1px solid var(--border-subtle)",
                  paddingTop: "0.35rem",
                }}
              >
                {topic.plannerMetricNote}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

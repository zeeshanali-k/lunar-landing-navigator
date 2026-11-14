import { Compass, Moon, Radio, Sun } from "lucide-react";
import {
  azElevToThreeXYZ,
  clampLunarLatitude,
  type EvaluateResponse,
  type SiteSummary,
} from "./types";

const SAMPLE_COORDS = {
  latDeg: clampLunarLatitude(-90.0),
  northVec: azElevToThreeXYZ(0, 0),
};

const CONTRACT_STATUS: { label: string; detail: string }[] = [
  { label: "Contract A", detail: "SiteSummary (GET /api/v1/sites)" },
  { label: "Contract B", detail: "EvaluateResponse (POST /api/v1/evaluate)" },
  { label: "Contract C", detail: "TerrainPatch local_enu (GET /sites/{id}/terrain)" },
  { label: "Contract D", detail: "CompareResponse (POST /api/v1/compare)" },
  { label: "Contract E", detail: "WindowsResponse (POST /api/v1/windows)" },
];

type ContractCheck = {
  siteType?: SiteSummary["category"];
  evalType?: EvaluateResponse["summary"]["feasibility_score"];
};

const _typeVerification: ContractCheck = {
  siteType: "artemis_iii",
  evalType: 84.5,
};
void _typeVerification;

export function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
        maxWidth: "960px",
        margin: "0 auto",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Moon size={28} color="#f59e0b" />
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>
            Lunar Landing Site Navigator
          </h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)" }}>
            Track 0 Foundation Ready — Clean Architecture &amp; Locked Contracts A–E
          </p>
        </div>
      </header>

      <section
        style={{
          marginTop: "1.5rem",
          padding: "1.25rem",
          background: "var(--bg-panel)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "0.75rem",
          display: "grid",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <Sun size={16} color="var(--accent-sun)" /> Frame: <code>local_enu</code>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <Compass size={16} color="var(--accent-ok)" /> Pole Clamp:{" "}
            <code>{SAMPLE_COORDS.latDeg.toFixed(4)}°</code>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <Radio size={16} color="var(--accent-dte)" /> North Axis:{" "}
            <code>[{SAMPLE_COORDS.northVec.map((v) => v.toFixed(1)).join(", ")}]</code>
          </span>
        </div>

        <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem", color: "var(--text-muted)" }}>
          {CONTRACT_STATUS.map((item) => (
            <li key={item.label}>
              <strong style={{ color: "var(--text-primary)" }}>{item.label}:</strong>{" "}
              {item.detail}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
export default App;

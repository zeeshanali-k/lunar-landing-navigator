/** Root application entry initializing mission state and rendering AppShell (F3.1). */

import { useEffect } from "react";
import { AppShell } from "./components/layout";
import { useMissionStore } from "./state";

export function App() {
  const initializeMission = useMissionStore((s) => s.initializeMission);

  useEffect(() => {
    void initializeMission();
  }, [initializeMission]);

  return <AppShell />;
}

export default App;

/** Root application entry initializing mission state and rendering AppShell (F3.1). */

import { useEffect } from "react";
import { AppShell } from "./components/layout";
import { useMissionStore, useUiStore } from "./state";

export function App() {
  const initializeMission = useMissionStore((s) => s.initializeMission);
  const initUiTheme = useUiStore((s) => s.initUiTheme);

  useEffect(() => {
    initUiTheme();
    void initializeMission();
  }, [initUiTheme, initializeMission]);

  return <AppShell />;
}

export default App;

import { useCallback, useState } from "react";

import "./components/layout/layout.css";

import CampusHome from "./components/CampusHome.jsx";
import HelpDesk from "./components/HelpDesk.jsx";
import NavigationPanel from "./components/NavigationPanel.jsx";
import AppHeader from "./components/layout/AppHeader.jsx";
import MobileNav from "./components/layout/MobileNav.jsx";
import { InstallBanner, OfflineBanner } from "./components/layout/PwaBanners.jsx";
import { useTheme } from "./hooks/useTheme.js";
import { useInstallPrompt, useOfflineNotice, useServiceWorker } from "./hooks/usePwa.js";

/* Every tab stays mounted and only its visibility toggles, so the map,
   the route and any running GPS session survive a tab switch. */
function TabPanel({ id, activeTab, children }) {
  return (
    <div
      className={`tab-panel ${activeTab === id ? "tab-panel--active" : ""}`}
      id={`tab-panel-${id}`}
    >
      {children}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("campus");

  // Building picked with "Get Directions" on the Campus tab, handed to the
  // Navigate tab, which clears it once applied.
  const [presetDestination, setPresetDestination] = useState(null);

  const { theme, toggleTheme } = useTheme();
  const installPrompt = useInstallPrompt();
  const offlineNotice = useOfflineNotice();
  useServiceWorker();

  const handleNavigateTo = useCallback((buildingName) => {
    setPresetDestination(buildingName);
    setActiveTab("navigate");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const clearPresetDestination = useCallback(() => setPresetDestination(null), []);

  return (
    <div className="app-container" id="gctu-app-root">
      {installPrompt.canInstall && (
        <InstallBanner onInstall={installPrompt.install} onDismiss={installPrompt.dismiss} />
      )}

      {offlineNotice.visible && <OfflineBanner onDismiss={offlineNotice.dismiss} />}

      <AppHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="app-main" id="gctu-app-main-frame">
        <TabPanel id="campus" activeTab={activeTab}>
          <CampusHome onNavigateTo={handleNavigateTo} />
        </TabPanel>

        <TabPanel id="navigate" activeTab={activeTab}>
          <NavigationPanel
            presetDestination={presetDestination}
            clearPresetDestination={clearPresetDestination}
            active={activeTab === "navigate"}
          />
        </TabPanel>

        <TabPanel id="help" activeTab={activeTab}>
          <HelpDesk />
        </TabPanel>
      </main>

      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

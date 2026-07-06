import React, { useState, useEffect } from "react";
import CampusHome from "./components/CampusHome";
import NavigationPanel from "./components/NavigationPanel";
import HelpDesk from "./components/HelpDesk";
import {
  Landmark,
  Compass,
  MessageSquare,
  X,
  Download,
  Sun,
  Moon,
} from "lucide-react";

export default function App() {
  // Navigation Tabs State (always mounted, toggled by .tab-panel--active)
  const [activeTab, setActiveTab] = useState("campus");

  // Cross-tab preset destination state
  const [presetDestination, setPresetDestination] = useState(null);

  // PWA Install Banner States
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // PWA Offline Alert States
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);

  // Theme Switching State (Light vs. Dark Mode)
  // Reads the theme preference from localStorage, falling back to system preference or default 'light'
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("gctu-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
    return "light";
  });

  // Sync active theme class directly into document body to trigger global CSS variable changes
  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
    localStorage.setItem("gctu-theme", theme);
  }, [theme]);

  // 1. Listen for PWA Install triggers
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
      console.log("beforeinstallprompt event fired and deferred.");
    };

    const handleAppInstalled = () => {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      console.log("PWA of GCTU Navigator was successfully installed!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // 2. Listen for Network Connectivity shifts
  useEffect(() => {
    const goOnline = () => {
      setIsOffline(false);
      setShowOfflineBanner(false);
    };

    const goOffline = () => {
      setIsOffline(true);
      setShowOfflineBanner(true);
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Initial load check
    if (!navigator.onLine) {
      setShowOfflineBanner(true);
    }

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // 3. Register PWA Service Worker
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log(
              "GCTU Service worker registered successfully: ",
              reg.scope,
            );
          })
          .catch((err) => {
            console.error("Service worker registration failed: ", err);
          });
      });
    }
  }, []);

  // Handle get directions clicked from CampusHome
  const handleNavigateTo = (buildingName) => {
    setPresetDestination(buildingName);
    setActiveTab("navigate");
    // Scroll smoothly to top on tab swap
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearPresetDestination = () => {
    setPresetDestination(null);
  };

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User prompt outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
  };

  const dismissOfflineBanner = () => {
    setShowOfflineBanner(false);
  };

  // Helper GCTU Logo component: Custom brand logo image
  const GctuLogo = () => (
    <img
      src="data:image/png;base64,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"
      alt="GCTU Logo"
      className="brand-logo-img"
      id="gctu-brand-logo"
      referrerPolicy="no-referrer"
      style={{
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        objectFit: "cover",
        border: "2px solid #FFD700",
        display: "block",
      }}
    />
  );

  return (
    <div className="app-container" id="gctu-app-root">
      {/* 2.4.1 INSTALL PWA BANNER (Top Gradient element) */}
      {showInstallBanner && deferredPrompt && (
        <div className="pwa-banner" id="pwa-install-banner">
          <div className="pwa-banner-content">
            <div className="pwa-banner-logo">
              <GctuLogo />
            </div>
            <div className="pwa-banner-text">
              <span className="pwa-banner-title">Install GCTU Navigator</span>
              <span className="pwa-banner-subtitle">
                Add to home screen — works offline
              </span>
            </div>
          </div>
          <div className="pwa-banner-actions">
            <button
              className="pwa-banner-btn"
              id="pwa-install-banner-confirm-btn"
              onClick={triggerInstall}
            >
              Install
            </button>
            <button
              className="pwa-banner-close"
              onClick={dismissInstallBanner}
              id="pwa-install-banner-dismiss-btn"
              aria-label="Dismiss banner"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 2.4.2 OFFLINE WARNING BANNER */}
      {showOfflineBanner && (
        <div className="offline-banner" id="pwa-offline-alert-banner">
          <span className="offline-text">
            📡 You're offline — campus map and directions still work from cache
          </span>
          <button
            className="offline-close"
            onClick={dismissOfflineBanner}
            id="pwa-offline-banner-close-btn"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sticky Top Header Header */}
      <header className="app-header" id="gctu-app-sticky-header">
        <div className="brand" id="gctu-brand-container">
          <GctuLogo />
          <div className="brand-info">
            <h1 className="brand-title">Campus Navigator</h1>
            <span className="brand-subtitle">GCTU Tesano</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Premium Theme Preference Toggle Button */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="theme-toggle-btn"
            id="gctu-theme-toggle-header-btn"
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            style={{
              background: "none",
              border: "1.5px solid rgba(255, 255, 255, 0.25)",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              cursor: "pointer",
              transition: "background-color 0.2s, border-color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "#FFD700")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)")
            }
          >
            {theme === "dark" ? (
              <Sun size={18} style={{ color: "#FFD700" }} />
            ) : (
              <Moon size={18} />
            )}
          </button>

          {/* Tab triggers displayed on larger Viewports */}
          <nav className="header-tabs" id="gctu-desktop-nav-header">
            <button
              className={`tab-btn ${activeTab === "campus" ? "active" : ""}`}
              onClick={() => setActiveTab("campus")}
              id="btn-header-tab-campus"
            >
              🏫 Campus
            </button>
            <button
              className={`tab-btn ${activeTab === "navigate" ? "active" : ""}`}
              onClick={() => setActiveTab("navigate")}
              id="btn-header-tab-navigate"
            >
              🧭 Navigate
            </button>
            <button
              className={`tab-btn ${activeTab === "help" ? "active" : ""}`}
              onClick={() => setActiveTab("help")}
              id="btn-header-tab-help"
            >
              💬 Help Desk
            </button>
          </nav>
        </div>
      </header>

      {/* Primary content routing frame */}
      <main className="app-main" id="gctu-app-main-frame">
        {/* Toggling tabs toggles the custom active CSS class, keeping elements permanently mounted */}
        <div
          className={`tab-panel ${activeTab === "campus" ? "tab-panel--active" : ""}`}
          id="tab-panel-campus"
        >
          <CampusHome onNavigateTo={handleNavigateTo} />
        </div>

        <div
          className={`tab-panel ${activeTab === "navigate" ? "tab-panel--active" : ""}`}
          id="tab-panel-navigate"
        >
          <NavigationPanel
            presetDestination={presetDestination}
            clearPresetDestination={clearPresetDestination}
            theme={theme}
            active={activeTab === "navigate"}
          />
        </div>

        <div
          className={`tab-panel ${activeTab === "help" ? "tab-panel--active" : ""}`}
          id="tab-panel-help`"
        >
          <HelpDesk />
        </div>
      </main>

      {/* 2.4 Mobile Nav layout bar */}
      <nav className="mobile-nav" id="gctu-mobile-nav-footer">
        <button
          className={`mobile-nav-item ${activeTab === "campus" ? "active" : ""}`}
          onClick={() => setActiveTab("campus")}
          id="footer-nav-btn-campus"
        >
          <Landmark />
          <span>Campus</span>
        </button>
        <button
          className={`mobile-nav-item ${activeTab === "navigate" ? "active" : ""}`}
          onClick={() => setActiveTab("navigate")}
          id="footer-nav-btn-navigate"
        >
          <Compass />
          <span>Navigate</span>
        </button>
        <button
          className={`mobile-nav-item ${activeTab === "help" ? "active" : ""}`}
          onClick={() => setActiveTab("help")}
          id="footer-nav-btn-help"
        >
          <MessageSquare />
          <span>Help Desk</span>
        </button>
      </nav>
    </div>
  );
}

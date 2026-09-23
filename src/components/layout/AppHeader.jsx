import { Moon, Sun } from "lucide-react";

import BrandLogo from "./BrandLogo.jsx";
import { TABS } from "./tabs.js";

/* Sticky header: brand, theme toggle, and (on wider screens) the tabs. */
export default function AppHeader({ activeTab, onTabChange, theme, onToggleTheme }) {
  const nextTheme = theme === "dark" ? "Light" : "Dark";

  return (
    <header className="app-header" id="gctu-app-sticky-header">
      <div className="brand" id="gctu-brand-container">
        <BrandLogo />
        <div className="brand-info">
          <h1 className="brand-title">Campus Navigator</h1>
          <span className="brand-subtitle">GCTU Tesano</span>
        </div>
      </div>

      <div className="header-actions">
        <button
          type="button"
          onClick={onToggleTheme}
          className="theme-toggle-btn"
          id="gctu-theme-toggle-header-btn"
          title={`Switch to ${nextTheme} Mode`}
          aria-label={`Switch to ${nextTheme} Mode`}
        >
          {theme === "dark" ? <Sun size={18} className="theme-toggle-sun" /> : <Moon size={18} />}
        </button>

        <nav className="header-tabs" id="gctu-desktop-nav-header" aria-label="Main">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => onTabChange(tab.id)}
              id={`btn-header-tab-${tab.id}`}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

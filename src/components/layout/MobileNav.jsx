import { TABS } from "./tabs.js";

/* Bottom tab bar on phones (hidden on wider screens by CSS). */
export default function MobileNav({ activeTab, onTabChange }) {
  return (
    <nav className="mobile-nav" id="gctu-mobile-nav-footer" aria-label="Main">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`mobile-nav-item ${activeTab === id ? "active" : ""}`}
          onClick={() => onTabChange(id)}
          id={`footer-nav-btn-${id}`}
          aria-current={activeTab === id ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

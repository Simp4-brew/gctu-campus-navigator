import { X } from "lucide-react";

import BrandLogo from "./BrandLogo.jsx";

/* "Install GCTU Navigator" banner, shown when the browser allows it. */
export function InstallBanner({ onInstall, onDismiss }) {
  return (
    <div className="pwa-banner" id="pwa-install-banner" role="region" aria-label="Install app">
      <div className="pwa-banner-content">
        <div className="pwa-banner-logo">
          <BrandLogo />
        </div>
        <div className="pwa-banner-text">
          <span className="pwa-banner-title">Install GCTU Navigator</span>
          <span className="pwa-banner-subtitle">Add to home screen — works offline</span>
        </div>
      </div>

      <div className="pwa-banner-actions">
        <button
          type="button"
          className="pwa-banner-btn"
          id="pwa-install-banner-confirm-btn"
          onClick={onInstall}
        >
          Install
        </button>
        <button
          type="button"
          className="pwa-banner-close"
          onClick={onDismiss}
          id="pwa-install-banner-dismiss-btn"
          aria-label="Dismiss banner"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

/* Shown while the device has no connection. */
export function OfflineBanner({ onDismiss }) {
  return (
    <div className="offline-banner" id="pwa-offline-alert-banner" role="status">
      <span className="offline-text">
        📡 You're offline — campus map and directions still work from cache
      </span>
      <button
        type="button"
        className="offline-close"
        onClick={onDismiss}
        id="pwa-offline-banner-close-btn"
        aria-label="Dismiss offline notice"
      >
        ✕
      </button>
    </div>
  );
}

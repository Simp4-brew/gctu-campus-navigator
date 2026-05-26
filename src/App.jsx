import React, { useState, useEffect } from 'react';
import CampusHome from './components/CampusHome';
import NavigationPanel from './components/NavigationPanel';
import HelpDesk from './components/HelpDesk';
import { Landmark, Compass, MessageSquare, X, Download, Sun, Moon } from 'lucide-react';

export default function App() {
  // Navigation Tabs State (always mounted, toggled by .tab-panel--active)
  const [activeTab, setActiveTab] = useState('campus');
  
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
    const savedTheme = localStorage.getItem('gctu-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  // Sync active theme class directly into document body to trigger global CSS variable changes
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('gctu-theme', theme);
  }, [theme]);

  // 1. Listen for PWA Install triggers
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
      console.log('beforeinstallprompt event fired and deferred.');
    };

    const handleAppInstalled = () => {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      console.log('PWA of GCTU Navigator was successfully installed!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
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

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Initial load check
    if (!navigator.onLine) {
      setShowOfflineBanner(true);
    }

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // 3. Register PWA Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            console.log('GCTU Service worker registered successfully: ', reg.scope);
          })
          .catch((err) => {
            console.error('Service worker registration failed: ', err);
          });
      });
    }
  }, []);

  // Handle get directions clicked from CampusHome
  const handleNavigateTo = (buildingName) => {
    setPresetDestination(buildingName);
    setActiveTab('navigate');
    // Scroll smoothly to top on tab swap
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Helper GCTU Logo component: Circular gold badge with Gulf Blue G inside
  const GctuLogo = () => (
    <svg viewBox="0 0 100 100" className="brand-logo-svg" id="gctu-svg-logo">
      <circle cx="50" cy="50" r="46" fill="#FFD700" stroke="#05195E" strokeWidth="3" />
      <text 
        x="50%" 
        y="58%" 
        dominantBaseline="middle" 
        textAnchor="middle" 
        fill="#05195E" 
        fontSize="54" 
        fontWeight="800" 
        fontFamily="system-ui, sans-serif"
      >
        G
      </text>
    </svg>
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
              <span className="pwa-banner-subtitle">Add to home screen — works offline</span>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Premium Theme Preference Toggle Button */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="theme-toggle-btn"
            id="gctu-theme-toggle-header-btn"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            style={{
              background: 'none',
              border: '1.5px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer',
              transition: 'background-color 0.2s, border-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#FFD700'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'}
          >
            {theme === 'dark' ? <Sun size={18} style={{ color: '#FFD700' }} /> : <Moon size={18} />}
          </button>

          {/* Tab triggers displayed on larger Viewports */}
          <nav className="header-tabs" id="gctu-desktop-nav-header">
            <button 
              className={`tab-btn ${activeTab === 'campus' ? 'active' : ''}`}
              onClick={() => setActiveTab('campus')}
              id="btn-header-tab-campus"
            >
              🏫 Campus
            </button>
            <button 
              className={`tab-btn ${activeTab === 'navigate' ? 'active' : ''}`}
              onClick={() => setActiveTab('navigate')}
              id="btn-header-tab-navigate"
            >
              🧭 Navigate
            </button>
            <button 
              className={`tab-btn ${activeTab === 'help' ? 'active' : ''}`}
              onClick={() => setActiveTab('help')}
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
          className={`tab-panel ${activeTab === 'campus' ? 'tab-panel--active' : ''}`}
          id="tab-panel-campus"
        >
          <CampusHome onNavigateTo={handleNavigateTo} />
        </div>

        <div 
          className={`tab-panel ${activeTab === 'navigate' ? 'tab-panel--active' : ''}`}
          id="tab-panel-navigate"
        >
          <NavigationPanel 
            presetDestination={presetDestination} 
            clearPresetDestination={clearPresetDestination} 
            theme={theme}
            active={activeTab === 'navigate'}
          />
        </div>

        <div 
          className={`tab-panel ${activeTab === 'help' ? 'tab-panel--active' : ''}`}
          id="tab-panel-help`"
        >
          <HelpDesk />
        </div>
      </main>

      {/* 2.4 Mobile Nav layout bar */}
      <nav className="mobile-nav" id="gctu-mobile-nav-footer">
        <button 
          className={`mobile-nav-item ${activeTab === 'campus' ? 'active' : ''}`}
          onClick={() => setActiveTab('campus')}
          id="footer-nav-btn-campus"
        >
          <Landmark />
          <span>Campus</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'navigate' ? 'active' : ''}`}
          onClick={() => setActiveTab('navigate')}
          id="footer-nav-btn-navigate"
        >
          <Compass />
          <span>Navigate</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'help' ? 'active' : ''}`}
          onClick={() => setActiveTab('help')}
          id="footer-nav-btn-help"
        >
          <MessageSquare />
          <span>Help Desk</span>
        </button>
      </nav>

    </div>
  );
}

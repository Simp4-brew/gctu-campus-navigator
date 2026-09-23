import { useCallback, useEffect, useState } from "react";

/* =========================================================
   Progressive Web App helpers used by App.
========================================================= */

/* Captures the browser's install prompt so the app can offer its own
   "Install" banner. canInstall is false until the browser allows it,
   after installing, or once the banner is dismissed. */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setDismissed(false);
    };

    const handleInstalled = () => setDeferredPrompt(null);

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => setDismissed(true), []);

  return { canInstall: Boolean(deferredPrompt) && !dismissed, install, dismiss };
}

/* Shows the offline notice whenever the connection drops (and on load
   if already offline); hides it on reconnect or when dismissed. */
export function useOfflineNotice() {
  const [visible, setVisible] = useState(() => !navigator.onLine);

  useEffect(() => {
    const show = () => setVisible(true);
    const hide = () => setVisible(false);

    window.addEventListener("offline", show);
    window.addEventListener("online", hide);

    return () => {
      window.removeEventListener("offline", show);
      window.removeEventListener("online", hide);
    };
  }, []);

  const dismiss = useCallback(() => setVisible(false), []);

  return { visible, dismiss };
}

/* Registers public/sw.js in production builds. The effect can run after
   the window "load" event has already fired (a fast or cached load), in
   which case a load listener would never trigger, so register right away
   when the page is already loaded. */
export function useServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("Service worker registration failed:", err));
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
}

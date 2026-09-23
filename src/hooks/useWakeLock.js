import { useEffect } from "react";

/* Keeps the screen on while `active` (Screen Wake Lock API), so the phone
   does not lock mid-route and pause GPS tracking and announcements.
   Browsers release the lock when the page is hidden, so it is requested
   again when the page becomes visible. Unsupported browsers are ignored. */
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !navigator.wakeLock) {
      return;
    }

    let sentinel = null;
    let released = false;

    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
        if (released) sentinel.release().catch(() => {});
      } catch {
        // Denied (e.g. low battery mode) or not allowed: carry on without it.
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") request();
    };

    request();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}

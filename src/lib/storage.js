/* localStorage that never throws: private browsing, blocked site data
   or a full quota make the real API throw, and a preference or session
   token is never worth crashing the app over. */

export const storage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Not persisted; the in-memory state still works for this visit.
    }
  },

  remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Nothing to clean up.
    }
  },
};

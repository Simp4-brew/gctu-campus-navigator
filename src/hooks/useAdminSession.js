import { useCallback, useState } from "react";

import { api } from "../lib/api.js";
import { storage } from "../lib/storage.js";

const TOKEN_KEY = "gctu-admin-token";
const USERNAME_KEY = "gctu-admin-username";

export const SESSION_EXPIRED_MESSAGE =
  "Your admin session has expired. Please sign in again.";

/* =========================================================
   Admin sign-in state. The JWT and username are persisted so
   a reload keeps the admin signed in; signOut(message) ends
   the session, optionally explaining why (e.g. expiry).
========================================================= */

export function useAdminSession() {
  const [token, setToken] = useState(() => storage.get(TOKEN_KEY) || "");
  const [username, setUsername] = useState(() => storage.get(USERNAME_KEY) || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const signIn = useCallback(async (user, password) => {
    setLoading(true);
    setError("");

    try {
      const data = await api.login(user, password);
      const name = data.username || user;

      storage.set(TOKEN_KEY, data.token);
      storage.set(USERNAME_KEY, name);
      setToken(data.token);
      setUsername(name);
      return true;
    } catch (err) {
      setError(err.message || "Unable to sign in");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback((message = "") => {
    storage.remove(TOKEN_KEY);
    storage.remove(USERNAME_KEY);
    setToken("");
    setUsername("");
    setError(message);
  }, []);

  return {
    token,
    username,
    isSignedIn: Boolean(token),
    loading,
    error,
    signIn,
    signOut,
  };
}

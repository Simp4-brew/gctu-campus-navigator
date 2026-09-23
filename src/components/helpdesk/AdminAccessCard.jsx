import { useState } from "react";
import { AlertCircle } from "lucide-react";

import Banner from "../ui/Banner.jsx";
import SectionHeader from "../ui/SectionHeader.jsx";

/* Admin sign-in form, or the signed-in state with a sign-out button.
   `session` comes from useAdminSession(). */
export default function AdminAccessCard({ session }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (await session.signIn(username, password)) {
      setUsername("");
      setPassword("");
    }
  };

  return (
    <div className="support-form-card admin-card" id="admin-login-card">
      <SectionHeader id="admin-login-header" icon={<AlertCircle size={16} />}>
        Admin Access
      </SectionHeader>

      <p className="help-intro">Sign in to manage help-desk tickets.</p>

      {session.isSignedIn ? (
        <div>
          <Banner variant="success">Signed in as {session.username || "admin"}</Banner>

          <button
            type="button"
            className="submit-support-btn"
            id="admin-logout-btn"
            onClick={() => session.signOut()}
          >
            Sign Out
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="support-form" id="admin-login-form">
          <div className="form-group">
            <label htmlFor="admin-username">Admin Username</label>
            <input
              type="text"
              id="admin-username"
              className="form-inner-input"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="admin-password">Admin Password</label>
            <input
              type="password"
              id="admin-password"
              className="form-inner-input"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {session.error && <Banner variant="error">{session.error}</Banner>}

          <button
            type="submit"
            className="submit-support-btn"
            id="admin-login-btn"
            disabled={session.loading}
          >
            {session.loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      )}
    </div>
  );
}

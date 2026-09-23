import React, { useState, useEffect, useCallback } from "react";
import {
  Send,
  Phone,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  CheckCircle,
} from "lucide-react";

import {
  FAQS as FALLBACK_FAQS,
  CONTACTS as FALLBACK_CONTACTS,
} from "../data/helpdesk";

// Same-origin by default: the Vite dev server proxies /api to the Express
// server (see vite.config.ts), and a built app is served alongside it.
// VITE_API_URL only needs setting when the API lives on another host.
const API_BASE = `${import.meta.env.VITE_API_URL ?? ""}/api`;

const TOKEN_KEY = "gctu-admin-token";
const USERNAME_KEY = "gctu-admin-username";
const SESSION_EXPIRED = "Your admin session has expired. Please sign in again.";

// Resolve to the body of a successful list response and reject anything else.
// Storing an error body such as `{ error: "..." }` as a list made the next
// `.map` in render throw and take the whole app down.
async function fetchList(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok || !Array.isArray(data)) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export default function HelpDesk() {
  const [openFaq, setOpenFaq] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [contacts, setContacts] = useState([]);

  // Form State
  const [name, setName] = useState("");
  const [faculty, setFaculty] = useState("Computing (FoCIS)");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [adminUsername, setAdminUsername] = useState(
    () => localStorage.getItem(USERNAME_KEY) || "",
  );
  const [adminPassword, setAdminPassword] = useState("");
  const [adminToken, setAdminToken] = useState(
    () => localStorage.getItem(TOKEN_KEY) || "",
  );
  const adminLoggedIn = Boolean(adminToken);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");

  // Load FAQs and contacts on mount. If the API is unreachable (offline with
  // nothing cached, or the server is down) fall back to the bundled copy.
  useEffect(() => {
    fetchList(`${API_BASE}/faqs`)
      .then(setFaqs)
      .catch((err) => {
        console.error("Failed to load FAQs:", err);
        setFaqs(FALLBACK_FAQS);
      });

    fetchList(`${API_BASE}/contacts`)
      .then(setContacts)
      .catch((err) => {
        console.error("Failed to load contacts:", err);
        setContacts(FALLBACK_CONTACTS);
      });
  }, []);

  const endAdminSession = (message = "") => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    setAdminToken("");
    setAdminUsername("");
    setAdminPassword("");
    setAdminError(message);
    setTickets([]);
  };

  // The ticket list is admin-only, so it is fetched with the session token and
  // reloaded whenever the admin signs in or a stored session is restored.
  const fetchTickets = useCallback(() => {
    if (!adminToken) return;

    fetchList(`${API_BASE}/tickets`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then(setTickets)
      .catch((err) => {
        if (err.status === 401) endAdminSession(SESSION_EXPIRED);
        else console.error("Failed to load tickets:", err);
      });
  }, [adminToken]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminLoading(true);
    setAdminError("");

    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      const username = data.username || adminUsername;
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USERNAME_KEY, username);
      setAdminToken(data.token);
      setAdminUsername(username);
      setAdminPassword("");
    } catch (err) {
      setAdminError(err.message || "Unable to sign in");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminLogout = () => endAdminSession();

  const handleResolveTicket = async (ticketId) => {
    try {
      const res = await fetch(`${API_BASE}/tickets/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: "replied",
          reply: "Your request has been reviewed by the campus support desk.",
        }),
      });

      if (res.status === 401) {
        endAdminSession(SESSION_EXPIRED);
        return;
      }
      if (!res.ok) throw new Error("Unable to update ticket");
      const updated = await res.json();
      setTickets((prev) =>
        prev.map((ticket) => (ticket.ticketId === ticketId ? updated : ticket)),
      );
    } catch (err) {
      alert(err.message || "Unable to update ticket");
    }
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !subject || !message) {
      alert("Please fill out all required fields.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, faculty, subject, message }),
      });

      if (!res.ok) throw new Error("Failed to submit ticket");

      const newTicket = await res.json();
      setTickets((prev) => [newTicket, ...prev]);

      // Clear form
      setName("");
      setSubject("");
      setMessage("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);

      // Pick up the server's bot reply (sent ~2.5s after creation). A no-op
      // unless an admin is signed in, since only admins see the list.
      setTimeout(fetchTickets, 3000);
    } catch (err) {
      console.error(err);
      alert("Something went wrong submitting your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="help-desk-tab" className="help-desk-container">
      <div className="help-grid-split">
        {/* Left column FAQs */}
        <div className="help-section">
          <h3 className="section-header" id="faq-header">
            <HelpCircle size={18} /> GCTU Knowledge Base
          </h3>

          <div className="faq-card" id="faq-card-element">
            {faqs.map((faq, index) => (
              <div
                key={faq.faqId || faq._id}
                className={`faq-item ${openFaq === index ? "open" : ""}`}
                id={`faq-item-${faq.faqId}`}
              >
                <button
                  className="faq-trigger"
                  id={`faq-trigger-${faq.faqId}`}
                  onClick={() => toggleFaq(index)}
                >
                  <span>{faq.question}</span>
                  <span className="faq-icon-arrow">▼</span>
                </button>
                <div className="faq-content" id={`faq-content-${faq.faqId}`}>
                  <p className="faq-inner-text">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>

          <h3
            className="section-header"
            id="hotlines-header"
            style={{ marginTop: "0.5rem" }}
          >
            <Phone size={18} /> GCTU Support Hotlines
          </h3>
          <div className="contact-list" id="hotline-list">
            {contacts.map((con, index) => (
              <div
                key={con._id || index}
                className="contact-card"
                id={`contact-card-${index}`}
              >
                <div className="contact-info">
                  <span className="contact-dept">{con.dept}</span>
                  <span className="contact-phone">{con.phone}</span>
                </div>
                <button
                  className="dial-btn"
                  id={`dial-btn-${index}`}
                  onClick={() =>
                    window.open(`tel:${con.phone.replace(/\s+/g, "")}`)
                  }
                  title={`Dial ${con.dept}`}
                >
                  <Phone size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right column submitting ticket */}
        <div className="help-section">
          <h3 className="section-header" id="support-ticket-header">
            <MessageSquare size={18} /> Submit Help Request
          </h3>

          <div className="support-form-card" id="support-form-card">
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                marginBottom: "0.25rem",
              }}
            >
              Encountering Wi-Fi trouble, map inaccuracies, or academic desk
              issues? File a request in our offline-ready system.
            </p>

            {success && (
              <div
                className="simulation-banner"
                style={{
                  backgroundColor: "#E8F5E9",
                  borderLeftColor: "#2E7D32",
                  color: "#1B5E20",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                id="submit-success-banner"
              >
                <CheckCircle size={16} /> Request filed! Resolving support
                response...
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="support-form"
              id="help-desk-form"
            >
              <div className="form-group">
                <label htmlFor="student-name">Full Name *</label>
                <input
                  type="text"
                  id="student-name"
                  className="form-inner-input"
                  placeholder="e.g. Ama Serwaa"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="student-faculty">
                  Your Department / Faculty
                </label>
                <select
                  id="student-faculty"
                  className="form-inner-input"
                  style={{
                    height: "38px",
                    padding: "0 0.5rem",
                    backgroundColor: "var(--surface)",
                  }}
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                >
                  <option value="Computing (FoCIS)">
                    Faculty of Computing (FoCIS)
                  </option>
                  <option value="Engineering">Faculty of Engineering</option>
                  <option value="IT Business">Faculty of IT Business</option>
                  <option value="Graduate Studies">
                    School of Graduate Studies & Research
                  </option>
                  <option value="Visitor/Other">Visitor / Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="student-subject">Subject *</label>
                <input
                  type="text"
                  id="student-subject"
                  className="form-inner-input"
                  placeholder="e.g. Wi-Fi Connection Error"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="student-message">
                  How can GCTU help you? *
                </label>
                <textarea
                  id="student-message"
                  className="form-inner-input"
                  rows={4}
                  placeholder="Detail your request..."
                  required
                  style={{ resize: "none" }}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                ></textarea>
              </div>

              <button
                type="submit"
                className="submit-support-btn"
                id="submit-support-ticket-btn"
                disabled={submitting}
              >
                <Send size={15} /> {submitting ? "Filing..." : "Submit File"}
              </button>
            </form>

            <div
              className="support-form-card"
              id="admin-login-card"
              style={{
                marginTop: "0.75rem",
                border: "1px solid var(--border-color)",
              }}
            >
              <h3
                className="section-header"
                id="admin-login-header"
                style={{ marginBottom: "0.3rem" }}
              >
                <AlertCircle size={16} /> Admin Access
              </h3>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.45rem",
                }}
              >
                Sign in to manage help-desk tickets.
              </p>

              {!adminLoggedIn ? (
                <form
                  onSubmit={handleAdminLogin}
                  className="support-form"
                  id="admin-login-form"
                >
                  <div className="form-group">
                    <label htmlFor="admin-username">Admin Username</label>
                    <input
                      type="text"
                      id="admin-username"
                      className="form-inner-input"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="admin-password">Admin Password</label>
                    <input
                      type="password"
                      id="admin-password"
                      className="form-inner-input"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                    />
                  </div>
                  {adminError && (
                    <div
                      className="simulation-banner"
                      style={{
                        backgroundColor: "#ffefef",
                        color: "#8a1f1f",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {adminError}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="submit-support-btn"
                    id="admin-login-btn"
                    disabled={adminLoading}
                  >
                    {adminLoading ? "Signing in..." : "Sign In"}
                  </button>
                </form>
              ) : (
                <div>
                  <div
                    className="simulation-banner"
                    style={{
                      backgroundColor: "#E8F5E9",
                      color: "#1B5E20",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Signed in as {adminUsername || "admin"}
                  </div>
                  <button
                    type="button"
                    className="submit-support-btn"
                    id="admin-logout-btn"
                    onClick={handleAdminLogout}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {adminLoggedIn && (
            <>
              <h3
                className="section-header"
                id="recent-tickets-header"
                style={{ marginTop: "0.5rem" }}
              >
                Recent Activities
              </h3>
              <div className="ticket-history" id="ticket-history-list">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.ticketId || ticket._id}
                    className="ticket-item"
                    id={`ticket-item-${ticket.ticketId}`}
                  >
                    <div className="ticket-top">
                      <span className="ticket-id">
                        {ticket.ticketId} • {ticket.date}
                      </span>
                      <span className={`ticket-status ${ticket.status}`}>
                        {ticket.status === "open" ? "⌛ Pending" : "✓ Replied"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="submit-support-btn"
                      style={{
                        marginTop: "0.4rem",
                        padding: "0.35rem 0.6rem",
                        width: "fit-content",
                      }}
                      onClick={() => handleResolveTicket(ticket.ticketId)}
                      disabled={ticket.status === "replied"}
                    >
                      {ticket.status === "replied"
                        ? "Already Replied"
                        : "Mark Replied"}
                    </button>
                    <h4 className="ticket-subject">{ticket.subject}</h4>
                    <p className="ticket-msg">"{ticket.message}"</p>
                    {ticket.reply && (
                      <div
                        className="ticket-reply"
                        id={`ticket-reply-${ticket.ticketId}`}
                      >
                        <span className="ticket-reply-author">
                          🏫 Campus Support Desk Officer:
                        </span>
                        <p>{ticket.reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

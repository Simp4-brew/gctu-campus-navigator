import React, { useState, useEffect } from "react";
import {
  Send,
  Phone,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  CheckCircle,
} from "lucide-react";

const FAQS = [
  {
    id: "faq-wifi",
    question: "How do I connect to the GCTU Student Wi-Fi?",
    answer:
      "Select the 'GCTU-STUDENTS' network on your device. When the routing page appears, log in using your GCTU Student Portal ID and the default password provided at the admissions office. For IT support, visit the FOCIS computer labs.",
  },
  {
    id: "faq-clinic",
    question: "Where is the School Clinic located and what are the hours?",
    answer:
      "The School Hospital/Clinic is situated in the north sector, immediately adjacent to Classroom Block G (SGSR). It operates 24/7 for emergencies, consultation, and dispensary services, and is completely free of charge upon presenting a valid student ID.",
  },
  {
    id: "faq-portal",
    question: "How do I access my GCTU Digital Student Portal?",
    answer:
      "Go to portal.gctu.edu.gh in your browser. Enter your registered index number as username and the temporary password sent to your email. You can view your grades, register for courses, and print your fees transcripts here.",
  },
  {
    id: "faq-deadlines",
    question: "How can I check academic registration deadlines?",
    answer:
      "Filing and registry deadlines are published on the electronic board at the Main Administration Building foyer. You can also view current university circulars under the 'Announcements' tab on the general website gctu.edu.gh.",
  },
];

const CONTACTS = [
  { dept: "Main Admissions Office", phone: "+233 302 200 233" },
  { dept: "Academic Affairs Helpdesk", phone: "+233 302 221 234" },
  { dept: "FoCIS CS/IT Dean's office", phone: "+233 302 251 543" },
  { dept: "Engineering Faculty Admin", phone: "+233 302 251 654" },
  { dept: "School Clinic Emergency Line", phone: "+233 244 567 890" },
];

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
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminToken, setAdminToken] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("gctu-admin-token") || "";
  });
  const [adminLoggedIn, setAdminLoggedIn] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(localStorage.getItem("gctu-admin-token"));
  });
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");

  const API_BASE = "/api";

  // Load FAQs, contacts, and tickets from the API on mount
  useEffect(() => {
    fetch(`${API_BASE}/faqs`)
      .then((r) => r.json())
      .then(setFaqs)
      .catch((err) => console.error("Failed to load FAQs:", err));

    fetch(`${API_BASE}/contacts`)
      .then((r) => r.json())
      .then(setContacts)
      .catch((err) => console.error("Failed to load contacts:", err));

    fetchTickets();
  }, []);

  const fetchTickets = () => {
    fetch(`${API_BASE}/tickets`)
      .then((r) => r.json())
      .then(setTickets)
      .catch((err) => console.error("Failed to load tickets:", err));
  };

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

      localStorage.setItem("gctu-admin-token", data.token);
      setAdminToken(data.token);
      setAdminLoggedIn(true);
      setAdminUsername(data.username || adminUsername);
      setAdminPassword("");
    } catch (err) {
      setAdminError(err.message || "Unable to sign in");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem("gctu-admin-token");
    setAdminToken("");
    setAdminLoggedIn(false);
    setAdminUsername("");
    setAdminPassword("");
    setAdminError("");
  };

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

      // Poll for the bot reply after a short delay
      setTimeout(() => {
        fetchTickets();
      }, 3000);
    } catch (err) {
      console.error(err);
      alert("Something went wrong submitting your request. Please try again.");
    } finally {
      setSubmitting(false);
    }

    setTimeout(() => {
      setSuccess(false);
    }, 4000);
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

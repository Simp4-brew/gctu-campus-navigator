import { useEffect, useRef, useState } from "react";
import { CheckCircle, Send } from "lucide-react";

import { api } from "../../lib/api.js";
import Banner from "../ui/Banner.jsx";

const FACULTIES = [
  { value: "Computing (FoCIS)", label: "Faculty of Computing (FoCIS)" },
  { value: "Engineering", label: "Faculty of Engineering" },
  { value: "IT Business", label: "Faculty of IT Business" },
  { value: "Graduate Studies", label: "School of Graduate Studies & Research" },
  { value: "Visitor/Other", label: "Visitor / Other" },
];

const EMPTY_FORM = {
  name: "",
  faculty: FACULTIES[0].value,
  subject: "",
  message: "",
};

const SUCCESS_BANNER_MS = 4000;

/* Help request form. Calls onCreated(ticket) after the API stores it. */
export default function TicketForm({ onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const successTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(successTimerRef.current), []);

  const update = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();

    // The inputs are `required`, so browsers block this first; the check
    // here covers submissions that bypass native validation.
    if (!form.name || !form.subject || !form.message) {
      alert("Please fill out all required fields.");
      return;
    }

    setSubmitting(true);

    try {
      const ticket = await api.createTicket(form);

      // Keep the chosen faculty for the next request; clear the rest.
      setForm((current) => ({ ...EMPTY_FORM, faculty: current.faculty }));
      setSuccess(true);
      clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccess(false), SUCCESS_BANNER_MS);

      onCreated?.(ticket);
    } catch (err) {
      console.error(err);
      alert("Something went wrong submitting your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {success && (
        <Banner variant="success" id="submit-success-banner">
          <CheckCircle size={16} /> Request filed! Resolving support response...
        </Banner>
      )}

      <form onSubmit={handleSubmit} className="support-form" id="help-desk-form">
        <div className="form-group">
          <label htmlFor="student-name">Full Name *</label>
          <input
            type="text"
            id="student-name"
            className="form-inner-input"
            placeholder="e.g. Ama Serwaa"
            autoComplete="name"
            required
            value={form.name}
            onChange={update("name")}
          />
        </div>

        <div className="form-group">
          <label htmlFor="student-faculty">Your Department / Faculty</label>
          <select
            id="student-faculty"
            className="form-inner-input form-select"
            value={form.faculty}
            onChange={update("faculty")}
          >
            {FACULTIES.map((faculty) => (
              <option key={faculty.value} value={faculty.value}>
                {faculty.label}
              </option>
            ))}
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
            value={form.subject}
            onChange={update("subject")}
          />
        </div>

        <div className="form-group">
          <label htmlFor="student-message">How can GCTU help you? *</label>
          <textarea
            id="student-message"
            className="form-inner-input form-textarea"
            rows={4}
            placeholder="Detail your request..."
            required
            value={form.message}
            onChange={update("message")}
          />
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
    </>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { HelpCircle, MessageSquare, Phone } from "lucide-react";

import "./helpdesk/HelpDesk.css";

import { api } from "../lib/api.js";
import { SESSION_EXPIRED_MESSAGE, useAdminSession } from "../hooks/useAdminSession.js";
import { useHelpDeskContent } from "../hooks/useHelpDeskContent.js";
import AdminAccessCard from "./helpdesk/AdminAccessCard.jsx";
import FaqAccordion from "./helpdesk/FaqAccordion.jsx";
import HotlineList from "./helpdesk/HotlineList.jsx";
import TicketForm from "./helpdesk/TicketForm.jsx";
import TicketList from "./helpdesk/TicketList.jsx";
import SectionHeader from "./ui/SectionHeader.jsx";

// The server posts its automatic bot reply ~2.5s after a ticket is created.
const BOT_REPLY_REFRESH_MS = 3000;

const RESOLVED_REPLY = "Your request has been reviewed by the campus support desk.";

/* =========================================================
   HELP DESK

   Left: knowledge base and hotlines. Right: the help request
   form and admin access; signed-in admins also see and can
   resolve every ticket.
========================================================= */

export default function HelpDesk() {
  const { faqs, contacts } = useHelpDeskContent();
  const session = useAdminSession();
  const { token, signOut } = session;

  const [tickets, setTickets] = useState([]);
  const refreshTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(refreshTimerRef.current), []);

  // A 401 means the token expired or was revoked: end the session and say why.
  const handleAdminError = useCallback(
    (err, fallbackMessage) => {
      if (err.status === 401) {
        signOut(SESSION_EXPIRED_MESSAGE);
        return;
      }

      console.error(err);
      if (fallbackMessage) alert(err.message || fallbackMessage);
    },
    [signOut],
  );

  // The ticket list is admin-only, so it is fetched with the session token
  // and reloaded whenever an admin signs in or a stored session is restored.
  const loadTickets = useCallback(() => {
    if (!token) return;

    api
      .getTickets(token)
      .then(setTickets)
      .catch((err) => handleAdminError(err));
  }, [token, handleAdminError]);

  useEffect(() => {
    if (token) {
      loadTickets();
    } else {
      setTickets([]);
    }
  }, [token, loadTickets]);

  const handleTicketCreated = (ticket) => {
    setTickets((current) => [ticket, ...current]);

    // Pick up the bot reply. A no-op unless an admin is signed in.
    clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(loadTickets, BOT_REPLY_REFRESH_MS);
  };

  const handleResolveTicket = async (ticketId) => {
    try {
      const updated = await api.updateTicket(
        ticketId,
        { status: "replied", reply: RESOLVED_REPLY },
        token,
      );

      setTickets((current) =>
        current.map((ticket) => (ticket.ticketId === ticketId ? updated : ticket)),
      );
    } catch (err) {
      handleAdminError(err, "Unable to update ticket");
    }
  };

  return (
    <div id="help-desk-tab" className="help-desk-container">
      <div className="help-grid-split">
        {/* Knowledge base and hotlines */}
        <div className="help-section">
          <SectionHeader id="faq-header" icon={<HelpCircle size={18} />}>
            GCTU Knowledge Base
          </SectionHeader>
          <FaqAccordion faqs={faqs} />

          <SectionHeader
            id="hotlines-header"
            icon={<Phone size={18} />}
            className="section-header--spaced"
          >
            GCTU Support Hotlines
          </SectionHeader>
          <HotlineList contacts={contacts} />
        </div>

        {/* Help request and admin access */}
        <div className="help-section">
          <SectionHeader id="support-ticket-header" icon={<MessageSquare size={18} />}>
            Submit Help Request
          </SectionHeader>

          <div className="support-form-card" id="support-form-card">
            <p className="help-intro">
              Encountering Wi-Fi trouble, map inaccuracies, or academic desk
              issues? File a request in our offline-ready system.
            </p>

            <TicketForm onCreated={handleTicketCreated} />

            <AdminAccessCard session={session} />
          </div>

          {session.isSignedIn && (
            <>
              <SectionHeader id="recent-tickets-header" className="section-header--spaced">
                Recent Activities
              </SectionHeader>
              <TicketList tickets={tickets} onResolve={handleResolveTicket} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

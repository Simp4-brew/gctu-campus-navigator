/* Admin view of help-desk tickets, newest first. */
export default function TicketList({ tickets, onResolve }) {
  return (
    <div className="ticket-history" id="ticket-history-list">
      {tickets.map((ticket) => {
        const replied = ticket.status === "replied";

        return (
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
                {replied ? "✓ Replied" : "⌛ Pending"}
              </span>
            </div>

            <button
              type="button"
              className="submit-support-btn ticket-action-btn"
              onClick={() => onResolve(ticket.ticketId)}
              disabled={replied}
            >
              {replied ? "Already Replied" : "Mark Replied"}
            </button>

            <h4 className="ticket-subject">{ticket.subject}</h4>
            <p className="ticket-msg">"{ticket.message}"</p>

            {ticket.reply && (
              <div className="ticket-reply" id={`ticket-reply-${ticket.ticketId}`}>
                <span className="ticket-reply-author">
                  🏫 Campus Support Desk Officer:
                </span>
                <p>{ticket.reply}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

import { Phone } from "lucide-react";

/* Support hotlines; each dial button is a real tel: link, so it works
   with the keyboard, long-press and screen readers. */
export default function HotlineList({ contacts }) {
  return (
    <div className="contact-list" id="hotline-list">
      {contacts.map((contact, index) => (
        <div key={contact._id || index} className="contact-card" id={`contact-card-${index}`}>
          <div className="contact-info">
            <span className="contact-dept">{contact.dept}</span>
            <span className="contact-phone">{contact.phone}</span>
          </div>

          <a
            className="dial-btn"
            id={`dial-btn-${index}`}
            href={`tel:${contact.phone.replace(/\s+/g, "")}`}
            title={`Dial ${contact.dept}`}
            aria-label={`Call ${contact.dept}`}
          >
            <Phone size={15} />
          </a>
        </div>
      ))}
    </div>
  );
}

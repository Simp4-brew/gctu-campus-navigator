import { useState } from "react";

/* Expandable FAQ list; one answer open at a time. */
export default function FaqAccordion({ faqs }) {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="faq-card" id="faq-card-element">
      {faqs.map((faq) => {
        const id = faq.faqId || faq._id;
        const open = openId === id;

        return (
          <div key={id} className={`faq-item ${open ? "open" : ""}`} id={`faq-item-${faq.faqId}`}>
            <button
              type="button"
              className="faq-trigger"
              id={`faq-trigger-${faq.faqId}`}
              aria-expanded={open}
              aria-controls={`faq-content-${faq.faqId}`}
              onClick={() => setOpenId(open ? null : id)}
            >
              <span>{faq.question}</span>
              <span className="faq-icon-arrow" aria-hidden="true">
                ▼
              </span>
            </button>

            <div className="faq-content" id={`faq-content-${faq.faqId}`}>
              <p className="faq-inner-text">{faq.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

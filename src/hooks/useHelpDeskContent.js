import { useEffect, useState } from "react";

import { api } from "../lib/api.js";
import {
  FAQS as FALLBACK_FAQS,
  CONTACTS as FALLBACK_CONTACTS,
} from "../data/helpdesk.js";

/* FAQs and hotlines from the API. If the API is unreachable (offline
   with nothing cached, or the server is down) the bundled copy is used
   so the Help Desk never renders empty. */
export function useHelpDeskContent() {
  const [faqs, setFaqs] = useState([]);
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = (fetcher, setter, fallback, label) =>
      fetcher()
        .then((data) => !cancelled && setter(data))
        .catch((err) => {
          console.error(`Failed to load ${label}:`, err);
          if (!cancelled) setter(fallback);
        });

    load(api.getFaqs, setFaqs, FALLBACK_FAQS, "FAQs");
    load(api.getContacts, setContacts, FALLBACK_CONTACTS, "contacts");

    return () => {
      cancelled = true;
    };
  }, []);

  return { faqs, contacts };
}

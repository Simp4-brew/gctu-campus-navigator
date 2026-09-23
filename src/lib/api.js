/* =========================================================
   Client for the Express API. Every call resolves to the
   parsed JSON body or rejects with an ApiError carrying the
   HTTP status, so callers can tell "session expired" (401)
   apart from other failures.

   Same-origin by default: the Vite dev server proxies /api to
   Express (see vite.config.ts), and in production Express
   serves the built app itself. VITE_API_URL only needs setting
   when the API lives on another host.
========================================================= */

const API_BASE = `${import.meta.env.VITE_API_URL ?? ""}/api`;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, { method = "GET", body, token } = {}) {
  const headers = {};

  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let data = null;

  try {
    data = await res.json();
  } catch {
    // Non-JSON body (e.g. a proxy error page): handled by the status check.
  }

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }

  return data;
}

/* List endpoints must return an array. Storing an error body such as
   { error: "..." } as a list made the next .map() in render crash the
   whole app, so anything else is rejected here. */
async function requestList(path, options) {
  const data = await request(path, options);

  if (!Array.isArray(data)) {
    throw new ApiError("Unexpected response from the server", 500);
  }

  return data;
}

export const api = {
  getFaqs: () => requestList("/faqs"),

  getContacts: () => requestList("/contacts"),

  createTicket: ({ name, faculty, subject, message }) =>
    request("/tickets", {
      method: "POST",
      body: { name, faculty, subject, message },
    }),

  login: (username, password) =>
    request("/admin/login", {
      method: "POST",
      body: { username, password },
    }),

  getTickets: (token) => requestList("/tickets", { token }),

  updateTicket: (ticketId, changes, token) =>
    request(`/tickets/${encodeURIComponent(ticketId)}`, {
      method: "PATCH",
      body: changes,
      token,
    }),
};

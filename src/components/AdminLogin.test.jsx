import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import HelpDesk from "./HelpDesk";

/* =========================================================
   UT-05  Admin login (Help Desk admin access panel)

   The admin panel lives inside HelpDesk. These cases cover the
   client half: credentials in, token stored, session state
   flipped, errors surfaced. IT-05 covers the server half.
========================================================= */

const TOKEN = "header.payload.signature";
const ADMIN = "simp4.brew";

const TICKET = {
  _id: "652f1c9b1f4a2e0012aa77bd",
  ticketId: "TKT-4821",
  name: "Ama Serwaa",
  faculty: "Computing (FoCIS)",
  subject: "Wi-Fi Connection Error",
  message: "I cannot connect to GCTU-STUDENTS.",
  status: "open",
  reply: null,
  date: "12/09/2026",
};

// One stub for every call the component makes. The `login` option decides
// whether the credentials are accepted, so each test picks the outcome it needs.
function stubApi({ login = "ok", session = "valid" } = {}) {
  return vi.fn((url, options = {}) => {
    const target = String(url);
    const json = (status, body) =>
      Promise.resolve({
        ok: status < 400,
        status,
        json: () => Promise.resolve(body),
      });

    if (target.endsWith("/admin/login")) {
      if (login === "ok") return json(200, { token: TOKEN, username: ADMIN });
      if (login === "bad") return json(401, { error: "Invalid credentials" });
      return Promise.reject(new TypeError("Failed to fetch"));
    }

    if (target.includes("/tickets/") && options.method === "PATCH") {
      return json(200, { ...TICKET, status: "replied", reply: "Reviewed." });
    }

    if (target.endsWith("/tickets")) {
      if (session === "expired") {
        return json(401, { error: "Invalid or expired token" });
      }
      return json(200, [TICKET]);
    }

    return json(200, []);
  });
}

async function renderHelpDesk() {
  const utils = render(<HelpDesk />);
  // Let the mount-time GETs settle inside act().
  await act(async () => {});
  return utils;
}

function signIn(username = ADMIN, password = "correct-horse") {
  fireEvent.change(screen.getByLabelText(/admin username/i), {
    target: { value: username },
  });
  fireEvent.change(screen.getByLabelText(/admin password/i), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
}

function loginCalls() {
  return global.fetch.mock.calls.filter(([url]) =>
    String(url).endsWith("/admin/login"),
  );
}

beforeEach(() => {
  global.fetch = stubApi();
  vi.spyOn(window, "alert").mockImplementation(() => {});
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("UT-05  Admin login page", () => {
  it("renders the sign-in form with both credentials required", async () => {
    await renderHelpDesk();

    const username = screen.getByLabelText(/admin username/i);
    const password = screen.getByLabelText(/admin password/i);

    expect(username).toBeRequired();
    expect(password).toBeRequired();
    // The password must never be readable on screen.
    expect(password).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();

    // Signed out: no admin-only controls on the page.
    expect(screen.queryByText(/signed in as/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/recent activities/i)).not.toBeInTheDocument();
  });

  it("signs the admin in with valid credentials and stores the session token", async () => {
    await renderHelpDesk();
    signIn();

    await waitFor(() => expect(loginCalls()).toHaveLength(1));

    // --- the request that goes to the API ---
    const [url, options] = loginCalls()[0];

    expect(url).toMatch(/\/api\/admin\/login$/);
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(options.body)).toEqual({
      username: ADMIN,
      password: "correct-horse",
    });

    // --- the session it establishes ---
    expect(await screen.findByText(/signed in as/i)).toHaveTextContent(ADMIN);
    expect(window.localStorage.getItem("gctu-admin-token")).toBe(TOKEN);

    // The form is replaced by the signed-in panel.
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/admin password/i)).not.toBeInTheDocument();
  });

  it("unlocks ticket management once signed in", async () => {
    await renderHelpDesk();
    signIn();

    expect(await screen.findByText(/recent activities/i)).toBeInTheDocument();
    // The list is admin-only, so it is fetched with the token after sign-in.
    expect(await screen.findByText(/TKT-4821/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /mark replied/i }),
    ).toBeInTheDocument();
  });

  it("sends the stored token as a Bearer header on an admin-only action", async () => {
    await renderHelpDesk();
    signIn();

    fireEvent.click(await screen.findByRole("button", { name: /mark replied/i }));

    await waitFor(() => {
      const patch = global.fetch.mock.calls.find(
        ([, options]) => options && options.method === "PATCH",
      );
      expect(patch).toBeDefined();
      expect(patch[0]).toMatch(/\/api\/tickets\/TKT-4821$/);
      expect(patch[1].headers.Authorization).toBe(`Bearer ${TOKEN}`);
    });

    // The ticket flips to replied in the list.
    expect(
      await screen.findByRole("button", { name: /already replied/i }),
    ).toBeDisabled();
  });

  it("rejects invalid credentials with an inline error and no session", async () => {
    global.fetch = stubApi({ login: "bad" });

    await renderHelpDesk();
    signIn(ADMIN, "wrong-password");

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();

    // Still signed out, and nothing was persisted.
    expect(window.localStorage.getItem("gctu-admin-token")).toBeNull();
    expect(screen.queryByText(/signed in as/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/recent activities/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/admin password/i)).toBeInTheDocument();
  });

  it("blocks submission when a credential field is empty", async () => {
    await renderHelpDesk();

    fireEvent.change(screen.getByLabelText(/admin username/i), {
      target: { value: ADMIN },
    });

    const password = screen.getByLabelText(/admin password/i);
    expect(password).toBeInvalid();
    expect(password.validity.valueMissing).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(loginCalls()).toHaveLength(0);
    expect(window.localStorage.getItem("gctu-admin-token")).toBeNull();
  });

  it("signs out, clearing the stored token and restoring the form", async () => {
    await renderHelpDesk();
    signIn();

    await screen.findByText(/signed in as/i);

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));

    await waitFor(() =>
      expect(window.localStorage.getItem("gctu-admin-token")).toBeNull(),
    );

    expect(screen.getByLabelText(/admin password/i)).toBeInTheDocument();
    expect(screen.queryByText(/signed in as/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/recent activities/i)).not.toBeInTheDocument();
  });

  it("restores an existing session from a previously stored token", async () => {
    window.localStorage.setItem("gctu-admin-token", TOKEN);

    await renderHelpDesk();

    // Signed in on first paint, without hitting the login endpoint.
    expect(screen.getByText(/signed in as/i)).toBeInTheDocument();
    expect(loginCalls()).toHaveLength(0);
  });

  it("signs out and asks to sign in again when the stored session has expired", async () => {
    window.localStorage.setItem("gctu-admin-token", TOKEN);
    global.fetch = stubApi({ session: "expired" });

    await renderHelpDesk();

    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument();
    expect(window.localStorage.getItem("gctu-admin-token")).toBeNull();
    expect(screen.queryByText(/recent activities/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/admin password/i)).toBeInTheDocument();
  });
});

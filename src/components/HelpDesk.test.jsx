import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import HelpDesk from "./HelpDesk";

// The component loads FAQs, contacts and tickets on mount and POSTs the form.
// Every call goes through window.fetch, so one stub covers the lot and keeps
// the unit tests off the network.
function stubApi() {
  return vi.fn((url, options = {}) => {
    if (String(url).endsWith("/tickets") && options.method === "POST") {
      const sent = JSON.parse(options.body);
      return Promise.resolve({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            _id: "652f1c9b1f4a2e0012aa77bd",
            ticketId: "TKT-4821",
            status: "open",
            date: "12/09/2026",
            ...sent,
          }),
      });
    }

    // FAQs, contacts and the ticket list: empty but well-formed.
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
  });
}

// HelpDesk fires three GETs on mount (FAQs, contacts, tickets). Letting them
// settle inside act() keeps their state updates out of the test's own
// assertions - and off the console.
async function renderHelpDesk() {
  const utils = render(<HelpDesk />);
  await act(async () => {});
  return utils;
}

function fillField(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function postCalls() {
  return global.fetch.mock.calls.filter(
    ([, options]) => options && options.method === "POST",
  );
}

beforeEach(() => {
  global.fetch = stubApi();
  // handleSubmit reports the validation failure through window.alert.
  vi.spyOn(window, "alert").mockImplementation(() => {});
  // A successful submit schedules a 3s poll for the bot reply. Fake timers let
  // the test discard it instead of having it fire after the run has moved on.
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/* =========================================================
   UT-03
========================================================= */

describe("UT-03  Submit the Help Request form with all required fields completed", () => {
  it("creates a ticket object and returns a success response", async () => {
    await renderHelpDesk();

    fillField(/full name/i, "Ama Serwaa");
    fillField(/department \/ faculty/i, "Engineering");
    fillField(/subject/i, "Wi-Fi Connection Error");
    fillField(/how can gctu help you/i, "I cannot connect to GCTU-STUDENTS.");

    fireEvent.click(screen.getByRole("button", { name: /submit file/i }));

    // --- the ticket object that goes to the API ---
    await waitFor(() => expect(postCalls()).toHaveLength(1));

    const [url, options] = postCalls()[0];

    expect(url).toMatch(/\/api\/tickets$/);
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(options.body)).toEqual({
      name: "Ama Serwaa",
      faculty: "Engineering",
      subject: "Wi-Fi Connection Error",
      message: "I cannot connect to GCTU-STUDENTS.",
    });

    // --- the success response is surfaced to the student ---
    expect(await screen.findByText(/request filed/i)).toBeInTheDocument();
    expect(window.alert).not.toHaveBeenCalled();

    // The form resets, ready for the next request.
    await waitFor(() =>
      expect(screen.getByLabelText(/full name/i)).toHaveValue(""),
    );
  });
});

/* =========================================================
   UT-04
========================================================= */

describe("UT-04  Submit the Help Request form with a required field empty", () => {
  it("marks the empty required field invalid so the browser blocks submission", async () => {
    await renderHelpDesk();

    // Everything except the message is filled in.
    fillField(/full name/i, "Ama Serwaa");
    fillField(/subject/i, "Wi-Fi Connection Error");

    const message = screen.getByLabelText(/how can gctu help you/i);

    expect(message).toBeRequired();
    expect(message).toBeInvalid();
    expect(message.validity.valueMissing).toBe(true);

    // Clicking submit runs constraint validation, which blocks the submission
    // and anchors the browser's error message on the offending field.
    fireEvent.click(screen.getByRole("button", { name: /submit file/i }));

    expect(postCalls()).toHaveLength(0);
    expect(screen.queryByText(/request filed/i)).not.toBeInTheDocument();
  });

  it("blocks submission in the handler as well, so no ticket is sent", async () => {
    await renderHelpDesk();

    fillField(/full name/i, "Ama Serwaa");
    fillField(/subject/i, "Wi-Fi Connection Error");

    // Submit the form directly: this bypasses the browser's native check and
    // exercises the component's own guard underneath it.
    fireEvent.submit(document.getElementById("help-desk-form"));

    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith(
        "Please fill out all required fields.",
      ),
    );

    expect(postCalls()).toHaveLength(0);
    expect(screen.queryByText(/request filed/i)).not.toBeInTheDocument();
  });
});

/* =========================================================
   API failure handling
========================================================= */

describe("Help Desk content when the API fails", () => {
  it("shows the bundled FAQs and hotlines instead of crashing on an error response", async () => {
    // A server error arrives as a JSON object, not a list.
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "database unavailable" }),
      }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    await renderHelpDesk();

    expect(
      await screen.findByText(/connect to the GCTU Student Wi-Fi/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Main Admissions Office")).toBeInTheDocument();
  });
});

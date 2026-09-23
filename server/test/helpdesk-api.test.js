import "dotenv/config";

import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { connectDB } from "../db.js";
import Ticket from "../models/Ticket.js";
import { API } from "./helpers/api-server.js";

/* =========================================================
   IT-02

   The real thing end to end: the Help Desk form's payload is
   POSTed to the running Express API, which must persist it to
   the MongoDB Atlas tickets collection. Nothing here is mocked
   - the assertions read the document straight back out of the
   database.
========================================================= */

let createdTicketId;

beforeAll(async () => {
  // The server is already up (see globalSetup). This is a second, independent
  // connection used only to verify persistence.
  await connectDB();
}, 120000);

afterAll(async () => {
  if (createdTicketId) {
    await Ticket.deleteOne({ ticketId: createdTicketId });
  }
  await mongoose.disconnect();
}, 30000);

describe("IT-02  Help Desk form POSTs to the Express API and persists to MongoDB", () => {
  it("responds 201 with the created ticket", async () => {
    // Exactly the body HelpDesk's handleSubmit sends.
    const payload = {
      name: "Ama Serwaa",
      faculty: "Computing (FoCIS)",
      subject: "Wi-Fi Connection Error",
      message: "I cannot connect to GCTU-STUDENTS from the COLT block.",
    };

    const res = await fetch(`${API}/api/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(201);

    const ticket = await res.json();
    createdTicketId = ticket.ticketId;

    expect(ticket.ticketId).toMatch(/^TKT-\d{4}$/);
    expect(ticket).toMatchObject({ ...payload, status: "open" });
    expect(ticket._id).toBeDefined();
  }, 30000);

  it("makes the new ticket document visible in the tickets collection", async () => {
    const stored = await Ticket.findOne({ ticketId: createdTicketId }).lean();

    expect(stored).not.toBeNull();
    expect(stored.name).toBe("Ama Serwaa");
    expect(stored.faculty).toBe("Computing (FoCIS)");
    expect(stored.subject).toBe("Wi-Fi Connection Error");
    expect(stored.message).toBe(
      "I cannot connect to GCTU-STUDENTS from the COLT block.",
    );
    expect(stored.createdAt).toBeInstanceOf(Date);
  }, 30000);

  it("refuses to list tickets without an admin token", async () => {
    // Every ticket holds a student's name and message.
    const res = await fetch(`${API}/api/tickets`);

    expect(res.status).toBe(401);
  }, 30000);

  it("returns the persisted ticket from GET /api/tickets to an admin", async () => {
    const { token } = await fetch(`${API}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: process.env.ADMIN_USERNAME || "admin",
        password: process.env.ADMIN_PASSWORD || "admin123",
      }),
    }).then((r) => r.json());

    const res = await fetch(`${API}/api/tickets`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);

    const tickets = await res.json();

    expect(Array.isArray(tickets)).toBe(true);
    expect(tickets.some((t) => t.ticketId === createdTicketId)).toBe(true);
  }, 30000);

  it("rejects an incomplete ticket with 400 and stores nothing", async () => {
    const res = await fetch(`${API}/api/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ama Serwaa", faculty: "Engineering" }),
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "name, subject and message are required",
    });
  }, 30000);
});

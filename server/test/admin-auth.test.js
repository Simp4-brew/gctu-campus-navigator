import "dotenv/config";

import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { connectDB } from "../db.js";
import Admin from "../models/Admin.js";
import Ticket from "../models/Ticket.js";
import { API } from "./helpers/api-server.js";

/* =========================================================
   IT-05

   The real admin auth path: credentials go to the running
   Express API, bcrypt verifies them against the hash stored in
   MongoDB Atlas, and the JWT that comes back must actually
   unlock the admin-only ticket endpoint. Nothing is mocked.

   Credentials are read from the environment so they never
   appear in the repository.
========================================================= */

const USERNAME = process.env.ADMIN_USERNAME || "admin";
const PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const SECRET = process.env.JWT_SECRET || "dev-secret";

const login = (body) =>
  fetch(`${API}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

let token;
let scratchTicketId;

beforeAll(async () => {
  // The server is already up (see globalSetup).
  await connectDB();
}, 120000);

afterAll(async () => {
  // Remove only the ticket this file created; the admin account is left alone.
  if (scratchTicketId) await Ticket.deleteOne({ ticketId: scratchTicketId });
  await mongoose.disconnect();
}, 30000);

describe("IT-05  Admin login authenticates against MongoDB and unlocks admin actions", () => {
  it("stores the admin password as a bcrypt hash, never in plain text", async () => {
    const admin = await Admin.findOne({ username: USERNAME }).lean();

    expect(admin).not.toBeNull();
    // $2a$/$2b$/$2y$ prefix and 60 characters is the bcrypt format.
    expect(admin.password).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(admin.password).toHaveLength(60);
    expect(admin.password).not.toBe(PASSWORD);
  }, 30000);

  it("returns 200 and a signed JWT for valid credentials", async () => {
    const res = await login({ username: USERNAME, password: PASSWORD });

    expect(res.status).toBe(200);

    const body = await res.json();
    token = body.token;

    expect(body.username).toBe(USERNAME);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);

    // The token must verify against the server's own secret.
    const claims = jwt.verify(token, SECRET);

    expect(claims.username).toBe(USERNAME);
    expect(claims.id).toBeDefined();
    // Signed for an 8 hour session.
    expect(claims.exp - claims.iat).toBe(8 * 60 * 60);
  }, 30000);

  it("rejects a wrong password with 401", async () => {
    const res = await login({
      username: USERNAME,
      password: `${PASSWORD}-definitely-wrong`,
    });

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Invalid credentials" });
  }, 30000);

  it("rejects an unknown username with 401", async () => {
    const res = await login({
      username: "no-such-admin-account",
      password: PASSWORD,
    });

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Invalid credentials" });
  }, 30000);

  it("rejects a request with a missing credential with 400", async () => {
    const res = await login({ username: USERNAME });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "username and password are required",
    });
  }, 30000);

  it("uses the issued token to authorise an admin-only ticket update", async () => {
    // A throwaway ticket to act on.
    const created = await fetch(`${API}/api/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "IT-05 fixture",
        faculty: "Engineering",
        subject: "admin auth check",
        message: "created by the admin login integration test",
      }),
    }).then((r) => r.json());

    scratchTicketId = created.ticketId;
    expect(created.status).toBe("open");

    const res = await fetch(`${API}/api/tickets/${scratchTicketId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: "replied",
        reply: "Your request has been reviewed by the campus support desk.",
      }),
    });

    expect(res.status).toBe(200);

    const updated = await res.json();
    expect(updated.status).toBe("replied");

    // And the change really landed in MongoDB.
    const stored = await Ticket.findOne({ ticketId: scratchTicketId }).lean();
    expect(stored.status).toBe("replied");
  }, 30000);

  it("refuses the admin-only endpoint without a token", async () => {
    const res = await fetch(`${API}/api/tickets/${scratchTicketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "open" }),
    });

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: "Authentication required",
    });
  }, 30000);

  it("refuses a tampered token", async () => {
    // Same claims, signed with the wrong key.
    const forged = jwt.sign({ id: "fake", username: USERNAME }, "not-the-secret");

    const res = await fetch(`${API}/api/tickets/${scratchTicketId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${forged}`,
      },
      body: JSON.stringify({ status: "open" }),
    });

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: "Invalid or expired token",
    });
  }, 30000);

  it("refuses an expired token", async () => {
    const expired = jwt.sign({ id: "fake", username: USERNAME }, SECRET, {
      expiresIn: "-1s",
    });

    const res = await fetch(`${API}/api/tickets/${scratchTicketId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${expired}`,
      },
      body: JSON.stringify({ status: "open" }),
    });

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: "Invalid or expired token",
    });
  }, 30000);
});

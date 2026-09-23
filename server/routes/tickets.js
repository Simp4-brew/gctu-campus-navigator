import express from "express";

import Ticket from "../models/Ticket.js";
import { authenticateAdmin } from "../middleware/auth.js";
import { getBotReply } from "../services/botReply.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

const TICKET_STATUSES = Ticket.schema.path("status").enumValues;

// The automatic reply lands a moment after creation, like a real desk.
const BOT_REPLY_DELAY_MS = 2500;

// TKT-#### leaves only 9000 ids, so collisions are expected once tickets pile
// up. Retry on the unique-index violation instead of surfacing a 500.
async function createTicketWithUniqueId(fields, attempts = 5) {
  for (let i = 0; ; i++) {
    const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      return await Ticket.create({ ...fields, ticketId });
    } catch (err) {
      const duplicateId = err.code === 11000 && err.keyPattern?.ticketId;
      if (!duplicateId || i >= attempts - 1) throw err;
    }
  }
}

function scheduleBotReply(ticket) {
  setTimeout(async () => {
    // Runs outside any request, so nothing else would catch a failure here:
    // an unhandled rejection would take the whole server down. Only still-
    // open tickets are touched, so an admin's manual reply is never replaced.
    try {
      await Ticket.findOneAndUpdate(
        { ticketId: ticket.ticketId, status: "open" },
        { status: "replied", reply: getBotReply(ticket) },
      );
    } catch (err) {
      console.error(`Bot auto-reply failed for ${ticket.ticketId}:`, err.message);
    }
  }, BOT_REPLY_DELAY_MS);
}

// GET /api/tickets - all tickets, newest first. Admin only: every ticket
// carries a student's name and message.
router.get(
  "/",
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    res.json(await Ticket.find().sort({ createdAt: -1 }));
  }),
);

// POST /api/tickets - create a ticket (public)
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, faculty, subject, message } = req.body ?? {};

    if (!name || !subject || !message) {
      return res
        .status(400)
        .json({ error: "name, subject and message are required" });
    }

    const ticket = await createTicketWithUniqueId({
      name,
      faculty,
      subject,
      message,
      status: "open",
      date: new Date().toLocaleDateString(),
    });

    res.status(201).json(ticket);
    scheduleBotReply(ticket);
  }),
);

// PATCH /api/tickets/:ticketId - update status and/or reply (admin only)
router.patch(
  "/:ticketId",
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const { status, reply } = req.body ?? {};

    if (status !== undefined && !TICKET_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `status must be one of: ${TICKET_STATUSES.join(", ")}`,
      });
    }

    const ticket = await Ticket.findOneAndUpdate(
      { ticketId: req.params.ticketId },
      { ...(status && { status }), ...(reply !== undefined && { reply }) },
      { new: true },
    );

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.json(ticket);
  }),
);

export default router;

import express from 'express';
import Ticket from '../models/Ticket.js';

const router = express.Router();

// GET /api/tickets - all tickets, most recent first
router.get('/', async (req, res) => {
  try {
    const tickets = await Ticket.find().sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets - create a new ticket
router.post('/', async (req, res) => {
  try {
    const { name, faculty, subject, message } = req.body;
    if (!name || !subject || !message) {
      return res.status(400).json({ error: 'name, subject and message are required' });
    }

    const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const ticket = await Ticket.create({
      ticketId,
      name,
      faculty,
      subject,
      message,
      status: 'open',
      date: new Date().toLocaleDateString()
    });

    res.status(201).json(ticket);

    // Simulated bot auto-responder after delay
    setTimeout(async () => {
      let botReply = "Thank you for contacting GCTU Help Desk. We have received your query. An academic officer from your faculty will contact you shortly.";
      const lowerMsg = (message + " " + subject).toLowerCase();

      if (lowerMsg.includes('wi-fi') || lowerMsg.includes('wifi') || lowerMsg.includes('internet')) {
        botReply = "Hi! For campus Wi-Fi troubles, please ensure you are in range of the GCTU-STUDENTS routers located around COLT block and Administration. Clear your phone cache or visit the CIT directorate floor in the Administration building to renew your access.";
      } else if (lowerMsg.includes('clinic') || lowerMsg.includes('sick') || lowerMsg.includes('hospital') || lowerMsg.includes('health')) {
        botReply = "Hello. If you require medical attention, you may walk straight into the GCTU School Hospital located next to SGSR block. Ensure you carry your GCTU Student ID card. For absolute medical emergencies, please dial our direct line at +233 244 567 890.";
      } else if (lowerMsg.includes('portal') || lowerMsg.includes('grade') || lowerMsg.includes('exam')) {
        botReply = "Greetings! Digital Student Portal logins are managed by Academic registry. If you are locked out or see incorrect transcripts, please write directly to registry@gctu.edu.gh with your index number and an image of your receipt.";
      } else if (lowerMsg.includes('fees') || lowerMsg.includes('money') || lowerMsg.includes('pay') || lowerMsg.includes('bank')) {
        botReply = "Hi! Tuition payments are validated through EcoBank or Consolidated Bank Ghana (CBG) partners. Once deposited, ensure you bring your physical deposit slip to the finance counter at the Admin block to obtain your receipt.";
      }

      await Ticket.findOneAndUpdate(
        { ticketId },
        { status: 'replied', reply: botReply }
      );
    }, 2500);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tickets/:ticketId - update status/reply manually
router.patch('/:ticketId', async (req, res) => {
  try {
    const { status, reply } = req.body;
    const ticket = await Ticket.findOneAndUpdate(
      { ticketId: req.params.ticketId },
      { ...(status && { status }), ...(reply !== undefined && { reply }) },
      { new: true }
    );
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

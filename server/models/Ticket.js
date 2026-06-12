import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  faculty: { type: String, default: 'Visitor/Other' },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['open', 'replied'], default: 'open' },
  reply: { type: String, default: null },
  date: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Ticket', ticketSchema);

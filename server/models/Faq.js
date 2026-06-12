import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema({
  faqId: { type: String, required: true, unique: true },
  category: { type: String, default: 'General' },
  question: { type: String, required: true },
  answer: { type: String, required: true }
}, { timestamps: true });

faqSchema.index({ question: 'text', answer: 'text', category: 'text' });

export default mongoose.model('Faq', faqSchema);


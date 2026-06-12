import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  dept: { type: String, required: true },
  phone: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Contact', contactSchema);

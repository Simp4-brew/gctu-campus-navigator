import mongoose from 'mongoose';

const graphNodeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  type: { type: String, enum: ['building', 'junction'], required: true }
}, { timestamps: true });

export default mongoose.model('GraphNode', graphNodeSchema);

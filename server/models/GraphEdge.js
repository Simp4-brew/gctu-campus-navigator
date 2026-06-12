import mongoose from 'mongoose';

const graphEdgeSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('GraphEdge', graphEdgeSchema);

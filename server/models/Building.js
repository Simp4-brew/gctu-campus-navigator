import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  floor: { type: String, default: 'Ground Floor' },
  capacity: { type: Number, default: null },
  desc: { type: String, default: '' }
}, { _id: false });

const buildingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  shortName: { type: String, required: true },
  category: { type: String, required: true },
  emoji: { type: String, default: '' },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  desc: { type: String, default: '' },
  facts: { type: [String], default: [] },
  image: { type: String, default: '' },
  // Set for places that are inside another building (e.g. the Library,
  // on the Admin block's first floor): the host building's id and floor.
  insideBuilding: { type: String, default: null },
  floor: { type: String, default: null },
  // Search aliases e.g. "COLT", "Great Hall" so users can search by nickname
  aliases: { type: [String], default: [] },
  // Sub-locations within a building e.g. lecture halls, offices
  rooms: { type: [roomSchema], default: [] }
}, { timestamps: true });

// Text index for fast lookup like 'Room G6' or 'COLT'
buildingSchema.index({
  name: 'text',
  shortName: 'text',
  aliases: 'text',
  'rooms.name': 'text'
});

export default mongoose.model('Building', buildingSchema);


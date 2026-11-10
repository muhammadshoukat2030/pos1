import mongoose from "mongoose";

const blockedIPSchema = new mongoose.Schema({
  ip: { type: String, required: true, unique: true },
  blockedAt: { type: Date, default: Date.now }
});

export default mongoose.model("BlockedIP", blockedIPSchema);

import mongoose from "mongoose";

const agentSchema = new mongoose.Schema({
  agentID: {
    type: String,
    required: true,
    unique: true
  },

  name: {
    type: String,
    required: true
  },

  phone: {
    type: String,
    required: true
  },

  cnic: {
    type: String
  },

  items: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AgentItem"
    }
  ]
}, { timestamps: true });

export default mongoose.model("Agent", agentSchema);

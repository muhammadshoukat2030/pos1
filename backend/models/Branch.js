import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["store", "warehouse"],
      default: "store"
    },
    phone: {
      type: String,
      trim: true,
      default: ""
    },
    email: {
      type: String,
      trim: true,
      default: ""
    },
    address: {
      type: String,
      trim: true,
      default: ""
    },
    city: {
      type: String,
      trim: true,
      default: ""
    },
    managerName: {
      type: String,
      trim: true,
      default: ""
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    notes: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

// Performance Indexes
branchSchema.index({ type: 1, isActive: 1 });
branchSchema.index({ isDefault: 1 });

// Helper: Ensure a default branch exists for single-store backward compatibility
branchSchema.statics.ensureDefaultBranch = async function () {
  let defaultBranch = await this.findOne({ isDefault: true });
  if (!defaultBranch) {
    // Check if any branch exists
    defaultBranch = await this.findOne({ isActive: true });
    if (defaultBranch) {
      defaultBranch.isDefault = true;
      await defaultBranch.save();
    } else {
      // Seed default main store
      defaultBranch = await this.create({
        name: "Main Supermarket",
        code: "MAIN",
        type: "store",
        address: "Headquarters / Central Store",
        isDefault: true,
        isActive: true,
        notes: "Primary store location automatically initialized for universal operations."
      });
    }
  }
  return defaultBranch;
};

export default mongoose.model("Branch", branchSchema);

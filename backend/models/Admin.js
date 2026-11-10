import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    fullName: {
      type: String,
      trim: true,
      default: ""
    },
    email: {
      type: String,
      trim: true,
      default: ""
    },
    phone: {
      type: String,
      trim: true,
      default: ""
    },
    role: {
      type: String,
      enum: ["superadmin", "admin", "manager", "cashier", "inventory", "accountant", "worker"],
      default: "cashier",
      required: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    // ===== 2FA OTP FIELDS =====
    otp: {
      type: Number,
      default: null
    },
    otpExpires: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model("Admin", adminSchema);

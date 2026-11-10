import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    customerID: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    phone: {
      type: String,
      trim: true,
      default: ""
    },
    cnic: {
      type: String,
      trim: true,
      default: ""
    },
    address: {
      type: String,
      trim: true,
      default: ""
    },
    creditLimit: {
      type: Number,
      default: 50000 // default credit limit in PKR
    },
    currentBalance: {
      type: Number,
      default: 0 // positive = customer owes store (Accounts Receivable)
    },
    totalPurchases: {
      type: Number,
      default: 0
    },
    totalPaid: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ["Active", "Blocked"],
      default: "Active"
    },
    notes: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

// Auto-generate customerID if not present
customerSchema.pre("save", async function (next) {
  if (!this.customerID) {
    try {
      const count = await mongoose.model("Customer").countDocuments();
      this.customerID = `CUST-${String(count + 1).padStart(4, "0")}`;
    } catch (err) {
      this.customerID = `CUST-${Date.now().toString().slice(-4)}`;
    }
  }
  next();
});

// Search Indexes
customerSchema.index({ name: 1, phone: 1 });
customerSchema.index({ currentBalance: -1 });

const Customer = mongoose.model("Customer", customerSchema);
export default Customer;

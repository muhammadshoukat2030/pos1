import mongoose from "mongoose";

const ledgerTransactionSchema = new mongoose.Schema(
  {
    transactionType: {
      type: String,
      enum: [
        "Credit Sale",        // Sale made on credit (increases customer AR balance)
        "Payment Received",   // Cash-In from customer (decreases AR balance)
        "Cash Expense",       // Store operational cash-out (utilities, rent, tea, maintenance)
        "Supplier Purchase",  // Stock bought from supplier on credit (increases supplier payable)
        "Supplier Payment",   // Payment paid to supplier (decreases payable)
        "Refund Adjustment"   // Return adjustment
      ],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    // Customer Reference (if customer transaction)
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null
    },
    customerName: {
      type: String,
      default: ""
    },
    previousBalance: {
      type: Number,
      default: 0
    },
    newBalance: {
      type: Number,
      default: 0
    },
    // Related Bill/Invoice
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrintSale",
      default: null
    },
    billID: {
      type: String,
      default: ""
    },
    // Supplier Reference (if supplier transaction)
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null
    },
    supplierName: {
      type: String,
      default: ""
    },
    // Expense Category (if Cash Expense)
    expenseCategory: {
      type: String,
      default: "Other"
    },
    paymentMethod: {
      type: String,
      default: "Cash"
    },
    referenceNumber: {
      type: String,
      default: ""
    },
    notes: {
      type: String,
      default: ""
    },
    recordedBy: {
      type: String,
      default: "Admin"
    },
    date: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
);

const LedgerTransaction = mongoose.model("LedgerTransaction", ledgerTransactionSchema);
export default LedgerTransaction;

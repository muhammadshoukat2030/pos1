import mongoose from 'mongoose';

const printSaleSchema = new mongoose.Schema({
  billID: {
    type: String,
    required: true,
    unique: true
  },
  idempotencyKey: {
    type: String,
    sparse: true,
    index: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true,
    default: "Walk-in Customer"
  },
  customerPhone: {
    type: String,
    trim: true,
    default: ""
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  salesItems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale'
  }],
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    default: null
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },
  branchName: {
    type: String,
    default: "Main Branch"
  },
  orderType: {
    type: String,
    enum: ["Regular", "Wholesale", "Home Delivery"],
    default: "Regular"
  },
  status: {
    type: String,
    enum: ["Completed", "Dispatch", "Pending", "Held", "Draft", "Refunded"],
    default: "Completed"
  },
  subtotal: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: {
    type: String,
    default: ""
  },
  refundStatus: {
    type: String,
    enum: ["none", "Partially Refunded", "Refunded"],
    default: "none"
  },
  grandTotal: {
    type: Number,
    default: 0
  },
  cashReceived: {
    type: Number,
    default: 0
  },
  changeDue: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    default: "Cash"
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  outstandingAmount: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ["Paid", "Partially Paid", "Unpaid"],
    default: "Paid"
  },
  payments: [
    {
      paymentDate: { type: Date, default: Date.now },
      amount: { type: Number, required: true },
      paymentMethod: { type: String, default: "Cash" },
      referenceNumber: { type: String, default: "" },
      notes: { type: String, default: "" },
      recordedBy: { type: String, default: "Cashier" }
    }
  ],
  splitPayment: {
    isSplit: { type: Boolean, default: false },
    cashAmount: { type: Number, default: 0 },
    bankAmount: { type: Number, default: 0 },
    bankProvider: { type: String, default: "Card" }
  },
  notes: {
    type: String,
    default: ""
  }
}, { timestamps: true });

// Compound Performance & Sorting Indexes
printSaleSchema.index({ createdAt: -1 });
printSaleSchema.index({ customerId: 1, createdAt: -1 });
printSaleSchema.index({ customerName: 1, createdAt: -1 });
printSaleSchema.index({ paymentStatus: 1, createdAt: -1 });
printSaleSchema.index({ branchId: 1, createdAt: -1 });
printSaleSchema.index({ status: 1, createdAt: -1 });

const PrintSale = mongoose.model('PrintSale', printSaleSchema);
export default PrintSale;

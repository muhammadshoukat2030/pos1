import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema({
  brandName: { type: String },
  itemName: { type: String, required: true },
  barcode: { type: String },
  category: { type: String },
  colourName: { type: String },
  qty: { type: String },
  unit: { type: String, default: "pcs" },
  conversionFactor: { type: Number, default: 1 },
  baseQuantity: { type: Number },
  quantitySold: { type: Number, required: true },
  rate: { type: Number, required: true },
  unitTax: { type: Number, default: 0 },
  unitDiscount: { type: Number, default: 0 },
  stockID: { type: String, required: true },
  profit: { type: Number, default: 0 },
  branchId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Branch" 
  },
  branchName: { type: String, default: "Main Branch" },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProductBatch",
    default: null
  },
  batchNumber: { type: String, default: "" },
  expiryDate: { type: Date, default: null },
  refundQuantity: { type: Number, default: 0 },
  refundStatus: { type: String, default: "none" },
  isPriceOverridden: { type: Boolean, default: false },
  originalRate: { type: Number, default: 0 },
  overriddenBy: { type: String, default: null },
  saleID: { type: String, required: true },
  agentItemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "AgentItem",
    default: null 
  },
  billId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PrintSale" 
  }
}, { timestamps: true });

// Compound Performance & Join Indexes
saleSchema.index({ billId: 1 });
saleSchema.index({ stockID: 1, saleID: 1 });
saleSchema.index({ createdAt: -1 });

export default mongoose.model("Sale", saleSchema);

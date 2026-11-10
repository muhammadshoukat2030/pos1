import mongoose from "mongoose";

const stockAuditSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    itemName: {
      type: String,
      required: true
    },
    barcode: {
      type: String,
      default: ""
    },
    adjustmentType: {
      type: String,
      enum: [
        "Restock / Addition",
        "Damaged / Expired",
        "Audit Correction",
        "Returned from Customer",
        "Supplier Return",
        "Transfer In",
        "Transfer Out"
      ],
      required: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null
    },
    branchName: {
      type: String,
      default: ""
    },
    previousQuantity: {
      type: Number,
      required: true
    },
    changeQuantity: {
      type: Number,
      required: true
    },
    newQuantity: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      default: ""
    },
    adjustedBy: {
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

const StockAudit = mongoose.model("StockAudit", stockAuditSchema);
export default StockAudit;

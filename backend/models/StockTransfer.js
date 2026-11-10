import mongoose from "mongoose";

const stockTransferSchema = new mongoose.Schema(
  {
    transferNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    sourceBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true
    },
    destinationBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true
    },
    sourceBranchName: {
      type: String,
      required: true
    },
    destinationBranchName: {
      type: String,
      required: true
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        stockID: {
          type: String,
          required: true
        },
        itemName: {
          type: String,
          required: true
        },
        unit: {
          type: String,
          default: "pcs"
        },
        conversionFactor: {
          type: Number,
          default: 1
        },
        quantity: {
          type: Number,
          required: true,
          min: 0.001
        },
        baseQuantity: {
          type: Number,
          required: true
        },
        costPrice: {
          type: Number,
          default: 0
        }
      }
    ],
    totalItems: {
      type: Number,
      default: 0
    },
    totalQuantity: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ["Completed", "Cancelled", "In-Transit"],
      default: "Completed"
    },
    initiatedBy: {
      type: String,
      default: "Admin"
    },
    receivedBy: {
      type: String,
      default: ""
    },
    notes: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

stockTransferSchema.index({ sourceBranchId: 1, destinationBranchId: 1 });
stockTransferSchema.index({ createdAt: -1 });

export default mongoose.model("StockTransfer", stockTransferSchema);

import mongoose from "mongoose";

const locationStockSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true
    },
    stockID: {
      type: String,
      required: true,
      trim: true
    },
    remaining: {
      type: Number,
      default: 0
    },
    minStockAlert: {
      type: Number,
      default: 5
    },
    rackLocation: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { timestamps: true }
);

// Compound Unique Index: One stock record per product per branch
locationStockSchema.index({ branchId: 1, productId: 1 }, { unique: true });
locationStockSchema.index({ branchId: 1, stockID: 1 });
locationStockSchema.index({ branchId: 1, remaining: 1 });

/**
 * Adjust stock for a specific branch and product.
 * Returns the updated LocationStock document.
 */
locationStockSchema.statics.adjustStock = async function (
  branchId,
  productId,
  stockID,
  delta,
  minStockAlert = 5,
  rackLocation = ""
) {
  const roundedDelta = Math.round(Number(delta) * 1000) / 1000;
  const updateQuery = {
    $inc: { remaining: roundedDelta },
    $setOnInsert: {
      branchId,
      productId,
      stockID,
      minStockAlert: Number(minStockAlert) || 5,
      rackLocation: rackLocation || ""
    }
  };

  const doc = await this.findOneAndUpdate(
    { branchId, productId },
    updateQuery,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return doc;
};

export default mongoose.model("LocationStock", locationStockSchema);

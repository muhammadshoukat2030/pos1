import mongoose from "mongoose";

const productBatchSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true
    },
    batchNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true
    },
    branchName: {
      type: String,
      default: ""
    },
    manufacturingDate: {
      type: Date,
      default: null
    },
    expiryDate: {
      type: Date,
      default: null,
      index: true
    },
    costPrice: {
      type: Number,
      default: 0
    },
    salePrice: {
      type: Number,
      default: 0
    },
    quantityReceived: {
      type: Number,
      required: true,
      min: 0
    },
    quantityRemaining: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null
    },
    supplierName: {
      type: String,
      trim: true,
      default: ""
    },
    status: {
      type: String,
      enum: ["Active", "Depleted", "Expired", "Quarantined"],
      default: "Active",
      index: true
    },
    notes: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

// High Performance Compound Indexes for FEFO Queries
productBatchSchema.index({ productId: 1, expiryDate: 1, quantityRemaining: 1 });
productBatchSchema.index({ productId: 1, status: 1 });
productBatchSchema.index({ branchId: 1, productId: 1, expiryDate: 1 });
productBatchSchema.index({ batchNumber: 1 });

/**
 * FEFO Allocation Engine (First Expiry, First Out)
 * Allocates requested quantity from earliest-expiring active and non-expired batches.
 * Returns null if product is non-batched (backward compatibility).
 * Throws error if batched product lacks sufficient non-expired stock.
 */
productBatchSchema.statics.allocateFEFO = async function (productId, requestedQty, branchId = null) {
  const numQty = parseFloat(requestedQty);
  if (isNaN(numQty) || numQty <= 0) return [];

  // Check if product has any batches registered
  const totalBatchesCount = await this.countDocuments({ productId });
  if (totalBatchesCount === 0) {
    // Non-batched product -> fallback to standard inventory
    return null;
  }

  const now = new Date();
  const query = {
    productId,
    quantityRemaining: { $gt: 0 },
    status: "Active",
    $or: [
      { expiryDate: { $gt: now } },
      { expiryDate: null }
    ]
  };

  if (branchId) {
    query.$and = [{ $or: [{ branchId }, { branchId: null }] }];
  }

  // Fetch and sort: Earliest expiring batches first; non-expiring batches FIFO
  const eligibleBatches = await this.find(query);
  eligibleBatches.sort((a, b) => {
    if (a.expiryDate && b.expiryDate) {
      return new Date(a.expiryDate) - new Date(b.expiryDate);
    }
    if (a.expiryDate && !b.expiryDate) return -1;
    if (!a.expiryDate && b.expiryDate) return 1;
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  });

  const totalAvailable = eligibleBatches.reduce((acc, b) => acc + (b.quantityRemaining || 0), 0);

  if (totalAvailable < numQty) {
    // Check if expired stock exists
    const expiredCount = await this.countDocuments({
      productId,
      quantityRemaining: { $gt: 0 },
      expiryDate: { $lte: now }
    });

    const expMsg = expiredCount > 0 ? ` (${expiredCount} batch(es) expired and blocked from sale)` : "";
    throw new Error(
      `Insufficient non-expired batch stock. Available: ${totalAvailable}, Requested: ${numQty}${expMsg}.`
    );
  }

  let needed = numQty;
  const allocations = [];

  for (const batch of eligibleBatches) {
    const take = Math.min(batch.quantityRemaining, needed);
    batch.quantityRemaining = Math.round((batch.quantityRemaining - take) * 1000) / 1000;

    if (batch.quantityRemaining <= 0) {
      batch.status = "Depleted";
    }

    await batch.save();

    allocations.push({
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      allocatedQty: take,
      costPrice: batch.costPrice,
      salePrice: batch.salePrice
    });

    needed = Math.round((needed - take) * 1000) / 1000;
    if (needed <= 0) break;
  }

  return allocations;
};

/**
 * Restore returned quantity back to a specific batch
 */
productBatchSchema.statics.restoreBatch = async function (batchId, quantity) {
  if (!batchId) return null;
  const numQty = parseFloat(quantity);
  if (isNaN(numQty) || numQty <= 0) return null;

  const batch = await this.findById(batchId);
  if (!batch) return null;

  batch.quantityRemaining = Math.round((batch.quantityRemaining + numQty) * 1000) / 1000;

  // Reactivate depleted batch if within valid expiry date
  if (batch.status === "Depleted") {
    const now = new Date();
    if (new Date(batch.expiryDate) > now) {
      batch.status = "Active";
    } else {
      batch.status = "Expired";
    }
  }

  await batch.save();
  return batch;
};

export default mongoose.model("ProductBatch", productBatchSchema);

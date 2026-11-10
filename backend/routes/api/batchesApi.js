import express from "express";
import ProductBatch from "../../models/ProductBatch.js";
import Product from "../../models/Product.js";
import Branch from "../../models/Branch.js";
import LocationStock from "../../models/LocationStock.js";
import StockAudit from "../../models/StockAudit.js";
import { isLoggedIn } from "../../middleware/isLoggedIn.js";
import { allowRoles } from "../../middleware/allowRoles.js";

const router = express.Router();

// =========================================================================
// 1. GET /api/batches - List batches with search & filters
// =========================================================================
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const { productId, branchId, status, nearExpiry, expired, search, limit = 100 } = req.query;
    const filter = {};

    if (productId) filter.productId = productId;
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;

    const now = new Date();

    // Auto-update expired status for overdue active batches
    await ProductBatch.updateMany(
      { status: "Active", expiryDate: { $lte: now } },
      { $set: { status: "Expired" } }
    );

    if (nearExpiry === "true") {
      const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      filter.expiryDate = { $gt: now, $lte: thirtyDaysAhead };
      filter.quantityRemaining = { $gt: 0 };
    } else if (expired === "true") {
      filter.expiryDate = { $lte: now };
      filter.quantityRemaining = { $gt: 0 };
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { batchNumber: { $regex: q, $options: "i" } },
        { supplierName: { $regex: q, $options: "i" } }
      ];
    }

    const batches = await ProductBatch.find(filter)
      .populate("productId", "itemName stockID category unit remaining costPrice salePrice")
      .populate("branchId", "name code type")
      .sort({ expiryDate: 1 }) // FEFO sort order
      .limit(parseInt(limit) || 100)
      .lean();

    // Add daysUntilExpiry calculation to each batch
    const enriched = batches.map((b) => {
      const exp = new Date(b.expiryDate);
      const diffMs = exp.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return {
        ...b,
        daysUntilExpiry: diffDays,
        isExpired: diffDays <= 0,
        isNearExpiry: diffDays > 0 && diffDays <= 30
      };
    });

    return res.json({
      success: true,
      batches: enriched,
      count: enriched.length
    });
  } catch (err) {
    console.error("Error fetching product batches:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 2. GET /api/batches/alerts - Expiry Alerts Summary for Dashboard & POS
// =========================================================================
router.get("/alerts", isLoggedIn, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Auto-update expired status
    await ProductBatch.updateMany(
      { status: "Active", expiryDate: { $lte: now } },
      { $set: { status: "Expired" } }
    );

    const [nearExpiryBatches, expiredBatches, activeCount] = await Promise.all([
      ProductBatch.find({
        expiryDate: { $gt: now, $lte: thirtyDaysAhead },
        quantityRemaining: { $gt: 0 }
      })
        .populate("productId", "itemName stockID unit")
        .populate("branchId", "name code")
        .sort({ expiryDate: 1 })
        .limit(20)
        .lean(),

      ProductBatch.find({
        expiryDate: { $lte: now },
        quantityRemaining: { $gt: 0 }
      })
        .populate("productId", "itemName stockID unit")
        .populate("branchId", "name code")
        .sort({ expiryDate: -1 })
        .limit(20)
        .lean(),

      ProductBatch.countDocuments({ status: "Active", quantityRemaining: { $gt: 0 } })
    ]);

    return res.json({
      success: true,
      alerts: {
        activeBatchesCount: activeCount,
        nearExpiryCount: nearExpiryBatches.length,
        expiredCount: expiredBatches.length,
        nearExpiryBatches,
        expiredBatches
      }
    });
  } catch (err) {
    console.error("Error fetching batch alerts:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 3. POST /api/batches - Receive new batch / lot
// =========================================================================
router.post("/", isLoggedIn, allowRoles("admin", "manager", "inventory"), async (req, res) => {
  try {
    const {
      productId,
      batchNumber,
      branchId,
      manufacturingDate,
      expiryDate,
      costPrice,
      salePrice,
      quantityReceived,
      supplierId,
      supplierName = "",
      notes = ""
    } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: "Product is required for batch tracking." });
    }
    if (!batchNumber || !batchNumber.trim()) {
      return res.status(400).json({ success: false, message: "Batch / Lot number is required." });
    }
    if (!expiryDate) {
      return res.status(400).json({ success: false, message: "Batch Expiry Date is required." });
    }

    const expDate = new Date(expiryDate);
    const now = new Date();
    if (expDate <= now) {
      return res.status(400).json({
        success: false,
        message: "Invalid Expiry Date: cannot receive an already-expired batch into inventory."
      });
    }

    const qty = parseFloat(quantityReceived);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: "Received quantity must be greater than zero." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    // Resolve branch
    let targetBranch = null;
    if (branchId) {
      targetBranch = await Branch.findById(branchId);
    }
    if (!targetBranch) {
      targetBranch = await Branch.ensureDefaultBranch();
    }

    const cleanBatchNum = batchNumber.trim().toUpperCase();

    // Create the batch record
    const batch = await ProductBatch.create({
      productId: product._id,
      batchNumber: cleanBatchNum,
      branchId: targetBranch._id,
      branchName: targetBranch.name,
      manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
      expiryDate: expDate,
      costPrice: costPrice !== undefined ? Number(costPrice) : (product.costPrice || 0),
      salePrice: salePrice !== undefined ? Number(salePrice) : (product.salePrice || product.rate || 0),
      quantityReceived: qty,
      quantityRemaining: qty,
      supplierId: supplierId || null,
      supplierName: supplierName.trim(),
      status: "Active",
      notes: notes.trim()
    });

    // Synchronize Master Product stock and LocationStock
    const prevStock = product.remaining;
    product.remaining = Math.round((product.remaining + qty) * 1000) / 1000;
    await product.save();

    await LocationStock.adjustStock(
      targetBranch._id,
      product._id,
      product.stockID,
      qty
    );

    // Audit log
    await StockAudit.create({
      productId: product._id,
      itemName: product.itemName,
      barcode: product.barcode || product.stockID,
      adjustmentType: "Restock / Addition",
      previousQuantity: prevStock,
      changeQuantity: qty,
      newQuantity: product.remaining,
      reason: `Batch intake #${cleanBatchNum} (Exp: ${expDate.toLocaleDateString()}) at ${targetBranch.name}`,
      adjustedBy: req.user?.username || "Admin",
      branchId: targetBranch._id,
      branchName: targetBranch.name
    });

    return res.status(201).json({
      success: true,
      message: `Batch #${cleanBatchNum} received successfully (${qty} ${product.unit || 'pcs'} into '${targetBranch.name}').`,
      batch
    });
  } catch (err) {
    console.error("Error creating product batch:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 4. POST /api/batches/:id/quarantine - Quarantine expired/damaged batch
// =========================================================================
router.post("/:id/quarantine", isLoggedIn, allowRoles("admin", "manager", "inventory"), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = "Quarantined due to expiry or quality defect" } = req.body;

    const batch = await ProductBatch.findById(id).populate("productId");
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found." });
    }

    const availableQty = batch.quantityRemaining;
    if (availableQty <= 0) {
      batch.status = "Quarantined";
      await batch.save();
      return res.json({ success: true, message: `Batch #${batch.batchNumber} marked as quarantined.` });
    }

    // Deduct available lot quantity from active inventory
    batch.quantityRemaining = 0;
    batch.status = "Quarantined";
    batch.notes = `${batch.notes ? batch.notes + " | " : ""}Quarantine: ${reason}`;
    await batch.save();

    const product = batch.productId;
    if (product) {
      const prevStock = product.remaining;
      product.remaining = Math.max(0, Math.round((product.remaining - availableQty) * 1000) / 1000);
      await product.save();

      if (batch.branchId) {
        await LocationStock.adjustStock(
          batch.branchId,
          product._id,
          product.stockID,
          -availableQty
        );
      }

      await StockAudit.create({
        productId: product._id,
        itemName: product.itemName,
        barcode: product.barcode || product.stockID,
        adjustmentType: "Damaged / Expired",
        previousQuantity: prevStock,
        changeQuantity: -availableQty,
        newQuantity: product.remaining,
        reason: `Quarantine Batch #${batch.batchNumber}: ${reason}`,
        adjustedBy: req.user?.username || "Admin",
        branchId: batch.branchId || null,
        branchName: batch.branchName || ""
      });
    }

    return res.json({
      success: true,
      message: `Batch #${batch.batchNumber} quarantined. ${availableQty} units removed from active sellable inventory.`,
      batch
    });
  } catch (err) {
    console.error("Error quarantining batch:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 5. GET /api/batches/product/:productId - Get FEFO batches for a product
// =========================================================================
router.get("/product/:productId", isLoggedIn, async (req, res) => {
  try {
    const { productId } = req.params;
    const { branchId } = req.query;

    const query = {
      productId,
      quantityRemaining: { $gt: 0 },
      status: "Active"
    };

    if (branchId) {
      query.$or = [{ branchId }, { branchId: null }];
    }

    const batches = await ProductBatch.find(query).sort({ expiryDate: 1 }).lean();

    return res.json({
      success: true,
      batches,
      count: batches.length
    });
  } catch (err) {
    console.error("Error fetching product batches:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

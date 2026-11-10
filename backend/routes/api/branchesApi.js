import express from "express";
import Branch from "../../models/Branch.js";
import LocationStock from "../../models/LocationStock.js";
import StockTransfer from "../../models/StockTransfer.js";
import Product from "../../models/Product.js";
import StockAudit from "../../models/StockAudit.js";
import PrintSale from "../../models/PrintSale.js";
import { isLoggedIn } from "../../middleware/isLoggedIn.js";
import { allowRoles } from "../../middleware/allowRoles.js";

const router = express.Router();

// =========================================================================
// 1. GET /api/branches - List all stores & warehouses
// =========================================================================
router.get("/", isLoggedIn, async (req, res) => {
  try {
    // Ensure at least one default branch exists
    await Branch.ensureDefaultBranch();

    const { type, activeOnly } = req.query;
    const filter = {};
    if (type && ["store", "warehouse"].includes(type)) {
      filter.type = type;
    }
    if (activeOnly === "true") {
      filter.isActive = true;
    }

    const branches = await Branch.find(filter).sort({ isDefault: -1, createdAt: 1 }).lean();

    // Get item counts per branch
    const branchIds = branches.map((b) => b._id);
    const stockStats = await LocationStock.aggregate([
      { $match: { branchId: { $in: branchIds } } },
      {
        $group: {
          _id: "$branchId",
          totalSkus: { $sum: 1 },
          totalUnits: { $sum: "$remaining" },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ["$remaining", "$minStockAlert"] }, 1, 0]
            }
          }
        }
      }
    ]);

    const statsMap = new Map();
    stockStats.forEach((s) => statsMap.set(s._id.toString(), s));

    const enrichedBranches = branches.map((b) => {
      const stat = statsMap.get(b._id.toString()) || { totalSkus: 0, totalUnits: 0, lowStockCount: 0 };
      return {
        ...b,
        totalSkus: stat.totalSkus,
        totalUnits: Math.round(stat.totalUnits * 100) / 100,
        lowStockCount: stat.lowStockCount
      };
    });

    return res.json({
      success: true,
      branches: enrichedBranches,
      storesCount: enrichedBranches.filter((b) => b.type === "store").length,
      warehousesCount: enrichedBranches.filter((b) => b.type === "warehouse").length
    });
  } catch (err) {
    console.error("Error fetching branches:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 2. POST /api/branches - Create new store or warehouse
// =========================================================================
router.post("/", isLoggedIn, allowRoles("admin"), async (req, res) => {
  try {
    const {
      name,
      code,
      type = "store",
      phone = "",
      email = "",
      address = "",
      city = "",
      managerName = "",
      isDefault = false,
      notes = ""
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Branch name is required." });
    }
    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: "Branch unique code is required." });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await Branch.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({ success: false, message: `Branch code '${cleanCode}' already exists.` });
    }

    if (isDefault) {
      await Branch.updateMany({}, { isDefault: false });
    }

    const branch = await Branch.create({
      name: name.trim(),
      code: cleanCode,
      type: ["store", "warehouse"].includes(type) ? type : "store",
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      city: city.trim(),
      managerName: managerName.trim(),
      isDefault: Boolean(isDefault),
      isActive: true,
      notes: notes.trim()
    });

    return res.status(201).json({
      success: true,
      message: `${branch.type === "warehouse" ? "Warehouse" : "Store"} '${branch.name}' created successfully.`,
      branch
    });
  } catch (err) {
    console.error("Error creating branch:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 3. PUT /api/branches/:id - Update store or warehouse
// =========================================================================
router.put("/:id", isLoggedIn, allowRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({ success: false, message: "Branch not found." });
    }

    const {
      name,
      code,
      type,
      phone,
      email,
      address,
      city,
      managerName,
      isDefault,
      isActive,
      notes
    } = req.body;

    if (code && code.trim().toUpperCase() !== branch.code) {
      const cleanCode = code.trim().toUpperCase();
      const existing = await Branch.findOne({ code: cleanCode, _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ success: false, message: `Branch code '${cleanCode}' already exists.` });
      }
      branch.code = cleanCode;
    }

    if (name) branch.name = name.trim();
    if (type && ["store", "warehouse"].includes(type)) branch.type = type;
    if (phone !== undefined) branch.phone = phone.trim();
    if (email !== undefined) branch.email = email.trim();
    if (address !== undefined) branch.address = address.trim();
    if (city !== undefined) branch.city = city.trim();
    if (managerName !== undefined) branch.managerName = managerName.trim();
    if (notes !== undefined) branch.notes = notes.trim();
    if (isActive !== undefined) branch.isActive = Boolean(isActive);

    if (isDefault !== undefined && isDefault) {
      await Branch.updateMany({ _id: { $ne: id } }, { isDefault: false });
      branch.isDefault = true;
    }

    await branch.save();

    return res.json({
      success: true,
      message: `Branch '${branch.name}' updated successfully.`,
      branch
    });
  } catch (err) {
    console.error("Error updating branch:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 4. DELETE /api/branches/:id - Safe deletion or deactivation
// =========================================================================
router.delete("/:id", isLoggedIn, allowRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({ success: false, message: "Branch not found." });
    }

    if (branch.isDefault) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete the default branch. Designate another branch as default first."
      });
    }

    // Check if sales records exist
    const salesCount = await PrintSale.countDocuments({ branchId: id });
    if (salesCount > 0) {
      // Deactivate instead of hard delete to preserve historical financial integrity
      branch.isActive = false;
      await branch.save();
      return res.json({
        success: true,
        message: `Branch has ${salesCount} historical transaction(s). It has been deactivated instead of deleted to protect financial records.`,
        deactivated: true
      });
    }

    // Remove location stock records and branch
    await LocationStock.deleteMany({ branchId: id });
    await Branch.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: `Branch '${branch.name}' deleted successfully.`
    });
  } catch (err) {
    console.error("Error deleting branch:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 5. GET /api/branches/:id/stock - Stock Inventory for specific branch
// =========================================================================
router.get("/:id/stock", isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({ success: false, message: "Branch not found." });
    }

    // Check if this branch needs initial seeding from Product catalog
    const count = await LocationStock.countDocuments({ branchId: id });
    if (count === 0 && branch.isDefault) {
      // Auto-populate default branch stock from existing Product.remaining
      const allProducts = await Product.find().lean();
      if (allProducts.length > 0) {
        const seedDocs = allProducts.map((p) => ({
          branchId: branch._id,
          productId: p._id,
          stockID: p.stockID,
          remaining: p.remaining || 0,
          minStockAlert: p.minStockAlert || 5,
          rackLocation: ""
        }));
        await LocationStock.insertMany(seedDocs, { ordered: false }).catch(() => {});
      }
    }

    const { search, category, lowStockOnly } = req.query;

    // Fetch all products to join with location stock
    const prodFilter = {};
    if (category && category !== "all") {
      prodFilter.category = category;
    }
    if (search && search.trim()) {
      const q = search.trim();
      prodFilter.$or = [
        { itemName: { $regex: q, $options: "i" } },
        { barcode: { $regex: q, $options: "i" } },
        { stockID: { $regex: q, $options: "i" } },
        { brandName: { $regex: q, $options: "i" } }
      ];
    }

    const products = await Product.find(prodFilter).sort({ itemName: 1 }).lean();
    const productIds = products.map((p) => p._id);

    // Fetch location stock records
    const locationStocks = await LocationStock.find({
      branchId: id,
      productId: { $in: productIds }
    }).lean();

    const locMap = new Map();
    locationStocks.forEach((ls) => locMap.set(ls.productId.toString(), ls));

    let inventory = products.map((p) => {
      const ls = locMap.get(p._id.toString());
      const remaining = ls ? ls.remaining : (branch.isDefault ? (p.remaining || 0) : 0);
      const minStockAlert = ls ? ls.minStockAlert : (p.minStockAlert || 5);
      const rackLocation = ls ? ls.rackLocation : "";

      return {
        _id: p._id,
        productId: p._id,
        itemName: p.itemName,
        stockID: p.stockID,
        barcode: p.barcode,
        category: p.category,
        brandName: p.brandName,
        unit: p.unit,
        salePrice: p.salePrice || p.rate || 0,
        costPrice: p.costPrice || 0,
        remaining,
        minStockAlert,
        rackLocation,
        isLowStock: remaining <= minStockAlert,
        packagingUnits: p.packagingUnits || []
      };
    });

    if (lowStockOnly === "true") {
      inventory = inventory.filter((item) => item.isLowStock);
    }

    return res.json({
      success: true,
      branch: {
        _id: branch._id,
        name: branch.name,
        code: branch.code,
        type: branch.type,
        isDefault: branch.isDefault
      },
      inventory,
      totalCount: inventory.length
    });
  } catch (err) {
    console.error("Error fetching branch stock:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 6. POST /api/branches/:id/stock-adjust - Adjust stock at a specific branch
// =========================================================================
router.post("/:id/stock-adjust", isLoggedIn, allowRoles("admin", "manager", "inventory"), async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({ success: false, message: "Branch not found." });
    }

    const { productId, delta, reason = "", rackLocation, minStockAlert } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required." });
    }
    const numDelta = parseFloat(delta);
    if (isNaN(numDelta) || numDelta === 0) {
      return res.status(400).json({ success: false, message: "Valid numeric delta is required." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    // Get current stock
    let locStock = await LocationStock.findOne({ branchId: id, productId });
    const prevQty = locStock ? locStock.remaining : (branch.isDefault ? (product.remaining || 0) : 0);
    const newQty = Math.round((prevQty + numDelta) * 1000) / 1000;

    if (newQty < 0) {
      return res.status(400).json({
        success: false,
        message: `Adjustment rejected: stock at '${branch.name}' cannot be negative (current: ${prevQty}, requested delta: ${numDelta}).`
      });
    }

    locStock = await LocationStock.adjustStock(
      branch._id,
      product._id,
      product.stockID,
      numDelta,
      minStockAlert !== undefined ? minStockAlert : (locStock?.minStockAlert || 5),
      rackLocation !== undefined ? rackLocation : (locStock?.rackLocation || "")
    );

    // If default branch, sync Product.remaining
    if (branch.isDefault) {
      product.remaining = newQty;
      await product.save();
    }

    // Audit log
    await StockAudit.create({
      productId: product._id,
      itemName: product.itemName,
      barcode: product.barcode,
      adjustmentType: numDelta > 0 ? "Restock / Addition" : "Audit Correction",
      previousQuantity: prevQty,
      changeQuantity: numDelta,
      newQuantity: newQty,
      reason: `[${branch.name}] ${reason || "Branch inventory adjustment"}`,
      adjustedBy: req.user?.username || "Admin",
      branchId: branch._id,
      branchName: branch.name
    });

    return res.json({
      success: true,
      message: `Stock updated for '${product.itemName}' at '${branch.name}'. New stock: ${newQty}`,
      stock: locStock
    });
  } catch (err) {
    console.error("Error adjusting branch stock:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 7. POST /api/branches/transfer - Execute stock transfer between locations
// =========================================================================
router.post("/transfer", isLoggedIn, allowRoles("admin", "manager", "inventory"), async (req, res) => {
  try {
    const {
      sourceBranchId,
      destinationBranchId,
      items,
      notes = "",
      initiatedBy
    } = req.body;

    if (!sourceBranchId || !destinationBranchId) {
      return res.status(400).json({ success: false, message: "Source and destination locations are required." });
    }
    if (sourceBranchId.toString() === destinationBranchId.toString()) {
      return res.status(400).json({ success: false, message: "Source and destination cannot be the same location." });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Transfer item list cannot be empty." });
    }

    const [sourceBranch, destBranch] = await Promise.all([
      Branch.findById(sourceBranchId),
      Branch.findById(destinationBranchId)
    ]);

    if (!sourceBranch || !destBranch) {
      return res.status(404).json({ success: false, message: "Source or destination branch not found." });
    }
    if (!sourceBranch.isActive || !destBranch.isActive) {
      return res.status(400).json({ success: false, message: "Both source and destination must be active locations." });
    }

    // Validate stock availability for each item at source branch
    const productIds = items.map((it) => it.productId);
    const [products, sourceStocks] = await Promise.all([
      Product.find({ _id: { $in: productIds } }).lean(),
      LocationStock.find({ branchId: sourceBranchId, productId: { $in: productIds } }).lean()
    ]);

    const prodMap = new Map();
    products.forEach((p) => prodMap.set(p._id.toString(), p));

    const stockMap = new Map();
    sourceStocks.forEach((s) => stockMap.set(s.productId.toString(), s));

    const validatedItems = [];
    let totalQuantity = 0;

    for (const it of items) {
      const product = prodMap.get(it.productId?.toString());
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found for item: ${it.productId}` });
      }

      const qty = parseFloat(it.quantity);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ success: false, message: `Invalid quantity for product '${product.itemName}'.` });
      }

      const factor = parseFloat(it.conversionFactor) || 1;
      const baseQty = Math.round(qty * factor * 1000) / 1000;

      // Available stock at source branch
      const sDoc = stockMap.get(product._id.toString());
      const availableStock = sDoc ? sDoc.remaining : (sourceBranch.isDefault ? (product.remaining || 0) : 0);

      if (baseQty > availableStock) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for '${product.itemName}' at '${sourceBranch.name}'. Available: ${availableStock} ${product.unit || 'pcs'}, Requested: ${baseQty}`
        });
      }

      validatedItems.push({
        productId: product._id,
        stockID: product.stockID,
        itemName: product.itemName,
        unit: it.unit || product.unit || "pcs",
        conversionFactor: factor,
        quantity: qty,
        baseQuantity: baseQty,
        costPrice: product.costPrice || 0
      });

      totalQuantity += qty;
    }

    // Execute transfer movements atomically
    const transferNumber = `TRF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    for (const vItem of validatedItems) {
      // 1. Deduct from source branch
      await LocationStock.adjustStock(
        sourceBranch._id,
        vItem.productId,
        vItem.stockID,
        -vItem.baseQuantity
      );

      // 2. Add to destination branch
      await LocationStock.adjustStock(
        destBranch._id,
        vItem.productId,
        vItem.stockID,
        vItem.baseQuantity
      );

      // 3. Sync Product.remaining if source or destination is the default branch
      if (sourceBranch.isDefault) {
        await Product.updateOne({ _id: vItem.productId }, { $inc: { remaining: -vItem.baseQuantity } });
      } else if (destBranch.isDefault) {
        await Product.updateOne({ _id: vItem.productId }, { $inc: { remaining: vItem.baseQuantity } });
      }

      // 4. Audit logs for traceability
      await StockAudit.create({
        productId: vItem.productId,
        itemName: vItem.itemName,
        barcode: vItem.stockID,
        adjustmentType: "Transfer Out",
        previousQuantity: 0,
        changeQuantity: -vItem.baseQuantity,
        newQuantity: 0,
        reason: `Transfer to ${destBranch.name} (#${transferNumber})`,
        adjustedBy: initiatedBy || req.user?.username || "Admin",
        branchId: sourceBranch._id,
        branchName: sourceBranch.name
      });

      await StockAudit.create({
        productId: vItem.productId,
        itemName: vItem.itemName,
        barcode: vItem.stockID,
        adjustmentType: "Transfer In",
        previousQuantity: 0,
        changeQuantity: vItem.baseQuantity,
        newQuantity: 0,
        reason: `Transfer from ${sourceBranch.name} (#${transferNumber})`,
        adjustedBy: initiatedBy || req.user?.username || "Admin",
        branchId: destBranch._id,
        branchName: destBranch.name
      });
    }

    // Record Transfer Document
    const transferRecord = await StockTransfer.create({
      transferNumber,
      sourceBranchId: sourceBranch._id,
      destinationBranchId: destBranch._id,
      sourceBranchName: sourceBranch.name,
      destinationBranchName: destBranch.name,
      items: validatedItems,
      totalItems: validatedItems.length,
      totalQuantity,
      status: "Completed",
      initiatedBy: initiatedBy || req.user?.username || "Admin",
      notes: notes.trim()
    });

    return res.status(201).json({
      success: true,
      message: `Stock transfer #${transferNumber} completed successfully (${validatedItems.length} items transferred from '${sourceBranch.name}' to '${destBranch.name}').`,
      transfer: transferRecord
    });
  } catch (err) {
    console.error("Error executing stock transfer:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 8. GET /api/branches/transfers - Transfer History
// =========================================================================
router.get("/transfers", isLoggedIn, async (req, res) => {
  try {
    const { branchId, status, limit = 50 } = req.query;
    const filter = {};
    if (branchId) {
      filter.$or = [{ sourceBranchId: branchId }, { destinationBranchId: branchId }];
    }
    if (status) {
      filter.status = status;
    }

    const transfers = await StockTransfer.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) || 50)
      .lean();

    return res.json({
      success: true,
      transfers,
      count: transfers.length
    });
  } catch (err) {
    console.error("Error fetching transfer history:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

import express from "express";
import Purchase from "../../models/Purchase.js";
import Product from "../../models/Product.js";
import Supplier from "../../models/Supplier.js";
import ProductBatch from "../../models/ProductBatch.js";
import StockAudit from "../../models/StockAudit.js";
import LedgerTransaction from "../../models/LedgerTransaction.js";
import { isLoggedIn } from "../../middleware/isLoggedIn.js";
import { allowRoles } from "../../middleware/allowRoles.js";

const router = express.Router();

function escapeRegExp(string) {
  if (!string) return "";
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// =========================================================================
// 1. GET /api/purchases - List Purchases with Advanced Filters & Stats
// =========================================================================
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const {
      search,
      supplierId,
      productId,
      paymentStatus,
      from,
      to,
      page = 1,
      limit = 25,
      all = false
    } = req.query;

    const query = {};

    if (search && search.trim() !== "") {
      const regex = new RegExp(escapeRegExp(search.trim()), "i");
      query.$or = [
        { purchaseNumber: regex },
        { invoiceNumber: regex },
        { supplierName: regex },
        { "items.itemName": regex },
        { "items.barcode": regex },
        { "items.sku": regex }
      ];
    }

    if (supplierId && supplierId !== "all") {
      query.supplierId = supplierId;
    }

    if (productId && productId !== "all") {
      query["items.productId"] = productId;
    }

    if (paymentStatus && paymentStatus !== "all") {
      query.paymentStatus = paymentStatus;
    }

    if (from || to) {
      query.purchaseDate = {};
      if (from) {
        query.purchaseDate.$gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.purchaseDate.$lte = toDate;
      }
    }

    const isAll = all === "true" || all === true;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(limit) || 25));
    const skip = (pageNum - 1) * limitNum;

    const [totalCount, statsAgg, purchases] = await Promise.all([
      Purchase.countDocuments(query),
      Purchase.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalPurchasesAmount: { $sum: "$totalAmount" },
            totalPaid: { $sum: "$paidAmount" },
            totalBalanceDue: { $sum: "$balanceDue" }
          }
        }
      ]),
      isAll
        ? Purchase.find(query).sort({ purchaseDate: -1, createdAt: -1 }).lean()
        : Purchase.find(query).sort({ purchaseDate: -1, createdAt: -1 }).skip(skip).limit(limitNum).lean()
    ]);

    const stats = statsAgg[0] || {
      totalPurchasesAmount: 0,
      totalPaid: 0,
      totalBalanceDue: 0
    };

    const totalPages = isAll ? 1 : Math.ceil(totalCount / limitNum) || 1;

    return res.json({
      success: true,
      purchases,
      pagination: {
        page: isAll ? 1 : pageNum,
        limit: isAll ? totalCount : limitNum,
        totalPages,
        totalPurchases: totalCount,
        hasPrevPage: !isAll && pageNum > 1,
        hasNextPage: !isAll && pageNum < totalPages
      },
      stats: {
        totalPurchasesCount: totalCount,
        totalPurchasesAmount: Math.round((stats.totalPurchasesAmount || 0) * 100) / 100,
        totalPaid: Math.round((stats.totalPaid || 0) * 100) / 100,
        totalBalanceDue: Math.round((stats.totalBalanceDue || 0) * 100) / 100
      }
    });
  } catch (err) {
    console.error("Purchases List API Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 2. GET /api/purchases/suppliers/summary - Suppliers with Purchase Metrics
// =========================================================================
router.get("/suppliers/summary", isLoggedIn, async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ balanceDue: -1, name: 1 }).lean();

    // Aggregate supplier purchase counts and distinct items
    const purchaseStats = await Purchase.aggregate([
      {
        $group: {
          _id: "$supplierId",
          purchaseCount: { $sum: 1 },
          lastPurchaseDate: { $max: "$purchaseDate" },
          productsSupplied: { $addToSet: "$items.itemName" }
        }
      }
    ]);

    const statsMap = new Map();
    purchaseStats.forEach((s) => {
      if (s._id) {
        const flatProducts = [].concat(...(s.productsSupplied || []));
        statsMap.set(String(s._id), {
          purchaseCount: s.purchaseCount,
          lastPurchaseDate: s.lastPurchaseDate,
          productsSuppliedCount: new Set(flatProducts).size
        });
      }
    });

    const enriched = suppliers.map((sup) => {
      const extra = statsMap.get(String(sup._id)) || {
        purchaseCount: 0,
        lastPurchaseDate: null,
        productsSuppliedCount: 0
      };
      return {
        ...sup,
        ...extra
      };
    });

    return res.json({
      success: true,
      suppliers: enriched,
      count: enriched.length
    });
  } catch (err) {
    console.error("Suppliers Summary Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 3. GET /api/purchases/:id - Single Purchase Detail with Payments
// =========================================================================
router.get("/:id", isLoggedIn, async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate("supplierId", "name companyName phone email address balanceDue")
      .populate("items.productId", "itemName stockID barcode category brandName unit remaining")
      .lean();

    if (!purchase) {
      return res.status(404).json({ success: false, message: "Purchase order not found." });
    }

    return res.json({ success: true, purchase });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 4. POST /api/purchases - Record New Purchase / Restock Replenishment
// =========================================================================
router.post("/", isLoggedIn, allowRoles("admin", "manager", "inventory"), async (req, res) => {
  try {
    const {
      supplierId,
      supplierName,
      supplierPhone,
      supplierCompany,
      invoiceNumber = "",
      purchaseDate = new Date(),
      paidAmount = 0,
      paymentMethod = "Cash",
      paymentReference = "",
      notes = "",
      items = []
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "At least one product item is required for a purchase." });
    }

    // 1. Resolve or Create Supplier
    let supplier = null;
    if (supplierId && supplierId !== "none" && supplierId !== "") {
      supplier = await Supplier.findById(supplierId);
    } else if (supplierName && supplierName.trim() !== "") {
      const cleanName = supplierName.trim();
      supplier = await Supplier.findOne({ name: cleanName });
      if (!supplier) {
        supplier = await Supplier.create({
          name: cleanName,
          phone: supplierPhone ? supplierPhone.trim() : "",
          companyName: supplierCompany ? supplierCompany.trim() : "",
          balanceDue: 0,
          totalPurchases: 0,
          totalPaid: 0
        });
      }
    }

    // 2. Validate Items and Fetch Products
    const productIds = items.map((it) => it.productId).filter(Boolean);
    const existingProducts = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map();
    existingProducts.forEach((p) => productMap.set(String(p._id), p));

    const processedItems = [];
    let totalPurchaseAmount = 0;
    const pDate = purchaseDate ? new Date(purchaseDate) : new Date();

    // Unique sequential purchase reference number
    const count = await Purchase.countDocuments();
    const dateStr = pDate.toISOString().slice(0, 10).replace(/-/g, "");
    let purchaseNumber;
    let isUnique = false;
    let seq = count + 1;
    while (!isUnique) {
      const candidate = `PO-${dateStr}-${String(seq).padStart(4, "0")}`;
      const exists = await Purchase.findOne({ purchaseNumber: candidate });
      if (!exists) {
        purchaseNumber = candidate;
        isUnique = true;
      } else {
        seq++;
      }
    }

    for (const item of items) {
      const product = productMap.get(String(item.productId));
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product ID '${item.productId}' not found in inventory catalog.`
        });
      }

      const qty = parseFloat(item.quantity);
      const rawCost = item.purchasePrice !== undefined ? item.purchasePrice : item.costPrice;
      const cost = parseFloat(rawCost);
      const rawSale = item.sellingPrice !== undefined ? item.sellingPrice : (item.salePrice !== undefined ? item.salePrice : null);
      const sale = rawSale !== null ? parseFloat(rawSale) : (product.salePrice || product.rate || 0);

      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ success: false, message: `Invalid purchase quantity for "${product.itemName}".` });
      }
      if (isNaN(cost) || cost < 0) {
        return res.status(400).json({ success: false, message: `Invalid purchase price for "${product.itemName}".` });
      }

      const itemTotalCost = Math.round(qty * cost * 100) / 100;
      totalPurchaseAmount = Math.round((totalPurchaseAmount + itemTotalCost) * 100) / 100;

      const expiry = item.expiryDate ? new Date(item.expiryDate) : null;
      const batchNum = (item.batchNumber && item.batchNumber.trim() !== "")
        ? item.batchNumber.trim().toUpperCase()
        : `BAT-${(invoiceNumber ? invoiceNumber.trim().toUpperCase() : product.stockID)}-${Date.now().toString().slice(-4)}`;

      // Create ProductBatch for lot traceability and FEFO dispatch
      const newBatch = await ProductBatch.create({
        productId: product._id,
        batchNumber: batchNum,
        manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : null,
        expiryDate: expiry,
        costPrice: cost,
        salePrice: sale > 0 ? sale : product.salePrice,
        quantityReceived: qty,
        quantityRemaining: qty,
        supplierId: supplier ? supplier._id : null,
        supplierName: supplier ? supplier.name : (supplierName || ""),
        status: "Active",
        notes: `Purchase ${purchaseNumber} - Inv #${invoiceNumber || "N/A"}`
      });

      // Update Product available stock, costPrice, and supplier link
      const prevRemaining = product.remaining;
      product.totalProduct = Math.round(((product.totalProduct || 0) + qty) * 1000) / 1000;
      product.remaining = Math.round(((product.remaining || 0) + qty) * 1000) / 1000;
      product.costPrice = cost;
      product.lastPurchasePrice = cost;
      product.lastPurchaseDate = pDate;
      product.lastInvoiceNumber = invoiceNumber ? invoiceNumber.trim() : "";

      if (sale > 0) {
        product.salePrice = sale;
        product.rate = sale;
      }
      if (supplier) {
        product.supplierId = supplier._id;
        product.supplierName = supplier.name;
      }
      if (expiry) {
        product.expiryDate = expiry;
      }
      await product.save();

      // Record StockAudit
      await StockAudit.create({
        productId: product._id,
        itemName: product.itemName,
        barcode: product.barcode || product.stockID,
        adjustmentType: "Restock / Addition",
        previousQuantity: prevRemaining,
        changeQuantity: qty,
        newQuantity: product.remaining,
        reason: `Purchase ${purchaseNumber} (Invoice: ${invoiceNumber || "N/A"})`,
        adjustedBy: req.user?.username || "Admin"
      });

      processedItems.push({
        productId: product._id,
        itemName: product.itemName,
        barcode: product.barcode || product.stockID,
        sku: product.sku || product.stockID,
        unit: product.unit || "pcs",
        quantity: qty,
        purchasePrice: cost,
        sellingPrice: sale,
        totalCost: itemTotalCost,
        expiryDate: expiry,
        batchNumber: batchNum,
        batchId: newBatch._id
      });
    }

    // 3. Financial calculations & Payment status
    const numPaid = Math.max(0, parseFloat(paidAmount) || 0);
    const numBalance = Math.max(0, Math.round((totalPurchaseAmount - numPaid) * 100) / 100);

    let paymentStatus = "Paid";
    if (numBalance > 0 && numPaid > 0) {
      paymentStatus = "Partially Paid";
    } else if (numBalance > 0 && numPaid === 0) {
      paymentStatus = "Unpaid";
    }

    const initialPayments = [];
    if (numPaid > 0) {
      initialPayments.push({
        amount: numPaid,
        paymentDate: pDate,
        paymentMethod: paymentMethod || "Cash",
        referenceNumber: paymentReference ? paymentReference.trim() : (invoiceNumber || ""),
        notes: `Initial payment for Purchase ${purchaseNumber}`,
        recordedBy: req.user?.username || "Admin"
      });
    }

    // 4. Save Purchase Record
    const purchase = await Purchase.create({
      purchaseNumber,
      invoiceNumber: invoiceNumber ? invoiceNumber.trim() : "",
      supplierId: supplier ? supplier._id : null,
      supplierName: supplier ? supplier.name : (supplierName ? supplierName.trim() : ""),
      supplierPhone: supplier ? supplier.phone : (supplierPhone ? supplierPhone.trim() : ""),
      purchaseDate: pDate,
      items: processedItems,
      totalAmount: totalPurchaseAmount,
      paidAmount: numPaid,
      balanceDue: numBalance,
      paymentStatus,
      paymentMethod: paymentMethod || "Cash",
      payments: initialPayments,
      notes: notes ? notes.trim() : "",
      recordedBy: req.user?.username || "Admin"
    });

    // 5. Update Supplier Balance & Ledger
    if (supplier) {
      const prevBal = supplier.balanceDue || 0;
      supplier.totalPurchases = Math.round(((supplier.totalPurchases || 0) + totalPurchaseAmount) * 100) / 100;
      supplier.balanceDue = Math.round((prevBal + numBalance) * 100) / 100;
      supplier.totalPaid = Math.round(((supplier.totalPaid || 0) + numPaid) * 100) / 100;
      await supplier.save();

      // Ledger: Log purchase payable if balance remains
      if (numBalance > 0) {
        await LedgerTransaction.create({
          transactionType: "Supplier Purchase",
          amount: totalPurchaseAmount,
          supplierId: supplier._id,
          supplierName: supplier.name,
          previousBalance: prevBal,
          newBalance: supplier.balanceDue,
          referenceNumber: invoiceNumber || purchaseNumber,
          paymentMethod: numPaid > 0 ? "Partial Cash / Credit" : "AP Khata / Credit",
          notes: `Purchase ${purchaseNumber} (Inv #${invoiceNumber || "N/A"}). Total: PKR ${totalPurchaseAmount.toLocaleString()}, Paid: PKR ${numPaid.toLocaleString()}, Remaining Payable: PKR ${numBalance.toLocaleString()}`,
          recordedBy: req.user?.username || "Admin"
        });
      }

      // Ledger: Log paid cash outflow if upfront payment made
      if (numPaid > 0) {
        await LedgerTransaction.create({
          transactionType: "Supplier Payment",
          amount: numPaid,
          supplierId: supplier._id,
          supplierName: supplier.name,
          previousBalance: prevBal + totalPurchaseAmount,
          newBalance: supplier.balanceDue,
          referenceNumber: paymentReference || invoiceNumber || purchaseNumber,
          paymentMethod: paymentMethod || "Cash",
          notes: `Upfront payment on purchase ${purchaseNumber} (Inv #${invoiceNumber || "N/A"})`,
          recordedBy: req.user?.username || "Admin"
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: `Purchase ${purchaseNumber} recorded successfully! Stock added for ${processedItems.length} product(s).`,
      purchase
    });
  } catch (err) {
    console.error("Create Purchase Error:", err);
    return res.status(500).json({ success: false, message: "Failed to record purchase: " + err.message });
  }
});

// =========================================================================
// 5. POST /api/purchases/:id/payments - Record Installment on Purchase
// =========================================================================
router.post("/:id/payments", isLoggedIn, allowRoles("admin", "manager", "accountant"), async (req, res) => {
  try {
    const { amount, paymentMethod = "Cash", referenceNumber = "", notes = "" } = req.body;
    const paidNum = parseFloat(amount);

    if (isNaN(paidNum) || paidNum <= 0) {
      return res.status(400).json({ success: false, message: "Valid payment amount greater than zero is required." });
    }

    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: "Purchase order not found." });
    }

    if (purchase.balanceDue <= 0) {
      return res.status(400).json({ success: false, message: "This purchase invoice is already fully paid." });
    }

    const effectivePay = Math.min(paidNum, purchase.balanceDue);
    const newPurchaseBal = Math.round((purchase.balanceDue - effectivePay) * 100) / 100;
    purchase.paidAmount = Math.round((purchase.paidAmount + effectivePay) * 100) / 100;
    purchase.balanceDue = newPurchaseBal;
    purchase.paymentStatus = newPurchaseBal <= 0 ? "Paid" : "Partially Paid";

    purchase.payments.push({
      amount: effectivePay,
      paymentDate: new Date(),
      paymentMethod,
      referenceNumber: referenceNumber ? referenceNumber.trim() : "",
      notes: notes ? notes.trim() : `Installment on Purchase ${purchase.purchaseNumber}`,
      recordedBy: req.user?.username || "Admin"
    });

    await purchase.save();

    // Update Supplier Balance & Ledger
    let supplier = null;
    if (purchase.supplierId) {
      supplier = await Supplier.findById(purchase.supplierId);
      if (supplier) {
        const prevBal = supplier.balanceDue || 0;
        supplier.balanceDue = Math.max(0, Math.round((prevBal - effectivePay) * 100) / 100);
        supplier.totalPaid = Math.round(((supplier.totalPaid || 0) + effectivePay) * 100) / 100;
        await supplier.save();

        await LedgerTransaction.create({
          transactionType: "Supplier Payment",
          amount: effectivePay,
          supplierId: supplier._id,
          supplierName: supplier.name,
          previousBalance: prevBal,
          newBalance: supplier.balanceDue,
          referenceNumber: referenceNumber || purchase.purchaseNumber,
          paymentMethod,
          notes: notes || `Installment paid for Purchase ${purchase.purchaseNumber} (Inv #${purchase.invoiceNumber || "N/A"})`,
          recordedBy: req.user?.username || "Admin"
        });
      }
    }

    return res.json({
      success: true,
      message: `Payment of PKR ${effectivePay.toLocaleString()} recorded. Remaining purchase balance: PKR ${newPurchaseBal.toLocaleString()}`,
      purchase,
      supplier
    });
  } catch (err) {
    console.error("Purchase Payment Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

import express from "express";
import moment from "moment-timezone";
import Product from "../../models/Product.js";
import Sale from "../../models/Sale.js";
import PrintSale from "../../models/PrintSale.js";
import Agent from "../../models/Agent.js";
import Item from "../../models/Item.js";
import Customer from "../../models/Customer.js";
import LedgerTransaction from "../../models/LedgerTransaction.js";
import mongoose from "mongoose";
import StockAudit from "../../models/StockAudit.js";
import Branch from "../../models/Branch.js";
import LocationStock from "../../models/LocationStock.js";
import ProductBatch from "../../models/ProductBatch.js";
import { isLoggedIn } from "../../middleware/isLoggedIn.js";
import { allowRoles } from "../../middleware/allowRoles.js";

const router = express.Router();
const PKT_TIMEZONE = "Asia/Karachi";

function escapeRegExp(string) {
  if (!string) return "";
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Process and Save Sale Handler (with Idempotency & Automatic Compensation Rollback)
const handleSaleCreation = async (req, res) => {
  // Compensation tracking log to ensure strict rollback if any step fails
  const compensationLog = {
    createdSaleIds: [],
    stockDeductions: [], // [{ productId, stockID, baseStockDeduction, branchId }]
    batchAllocations: [], // [{ batchId, allocatedQty }]
    createdAgentItemId: null,
    createdLedgerTxId: null,
    customerKhata: null, // { cust, amount }
    createdBillId: null
  };

  try {
    const {
      sales,
      items,
      cart,
      agentID,
      percentage = 0,
      customerName = "Walk-in Customer",
      customerPhone = "",
      customerId = null,
      billID,
      idempotencyKey,
      orderType = "Regular",
      status = "Completed",
      paymentMethod = "Cash",
      splitPayment = null,
      taxAmount = 0,
      discountAmount = 0,
      cashReceived = 0,
      changeDue = 0,
      notes = "",
      heldBillId = null,
      branchId = null,
      branchName = ""
    } = req.body;

    // 0. Idempotency Check: Prevent duplicate billing on network retry or double-click
    const clientKey = (idempotencyKey || req.headers["x-idempotency-key"] || "").trim();
    if (clientKey) {
      const existingIdempotentBill = await PrintSale.findOne({
        $or: [{ idempotencyKey: clientKey }, { billID: clientKey }]
      })
        .populate("agentId", "name phone")
        .populate("salesItems")
        .lean();

      if (existingIdempotentBill) {
        return res.status(200).json({
          success: true,
          message: "Order already processed (idempotent replay).",
          billId: existingIdempotentBill._id,
          billID: existingIdempotentBill.billID,
          bill: existingIdempotentBill,
          isReplay: true
        });
      }
    }

    // Resolve Branch (Multi-Store & Warehouse Support)
    let activeBranch = null;
    if (branchId) {
      activeBranch = await Branch.findById(branchId);
    }
    if (!activeBranch) {
      activeBranch = await Branch.ensureDefaultBranch();
    }

    const cartList = sales || items || cart || [];

    if (!cartList || !Array.isArray(cartList) || cartList.length === 0) {
      return res.status(400).json({ success: false, message: "Cart cannot be empty. Please add items." });
    }

    // Guaranteed Unique, Non-Colliding Bill ID
    let uniqueBillID = (billID && billID.trim() !== "") ? billID.trim() : "";
    if (!uniqueBillID) {
      const dateStr = moment().tz(PKT_TIMEZONE).format("YYYYMMDD-HHmmss");
      const randEntropy = Math.floor(1000 + Math.random() * 9000);
      uniqueBillID = `INV-${dateStr}-${randEntropy}`;
    }

    // Upfront collision verification
    const existingCollidingBill = await PrintSale.findOne({ billID: uniqueBillID }).lean();
    if (existingCollidingBill) {
      if (existingCollidingBill.status === "Completed") {
        return res.status(200).json({
          success: true,
          message: "Order already completed.",
          billId: existingCollidingBill._id,
          billID: existingCollidingBill.billID,
          bill: existingCollidingBill,
          isReplay: true
        });
      }
      uniqueBillID = `${uniqueBillID}-${Math.floor(100 + Math.random() * 900)}`;
    }

    // 1. Fetch matching Products (by stockID or _id)
    const stockIDs = cartList.map((s) => s.stockID).filter(Boolean);
    const productIds = cartList.map((s) => s.productId || s._id).filter(Boolean);

    const queryOr = [];
    if (stockIDs.length > 0) queryOr.push({ stockID: { $in: stockIDs } });
    if (productIds.length > 0) queryOr.push({ _id: { $in: productIds } });

    const dbProducts = await Product.find(queryOr.length > 0 ? { $or: queryOr } : {});
    const productMap = new Map();
    dbProducts.forEach((p) => {
      if (p.stockID) productMap.set(p.stockID, p);
      productMap.set(p._id.toString(), p);
    });

    let totalQuantityForAgent = 0;
    let totalAmountForAgent = 0;
    let computedSubtotal = 0;
    const salesToCreate = [];
    const productUpdates = [];

    // 2. Validate Stock & Calculate Profit
    for (const s of cartList) {
      const product = productMap.get(s.stockID) || 
                      productMap.get(s.productId?.toString()) || 
                      productMap.get(s._id?.toString());
      const qtySold = parseFloat(s.quantitySold || s.quantity) || 1;
      const rateVal = parseFloat(s.rate || s.salePrice) || 0;
      const unitTax = parseFloat(s.unitTax) || 0;
      const unitDisc = parseFloat(s.unitDiscount) || 0;
      const conversionFactor = parseFloat(s.conversionFactor) || 1;
      const baseStockDeduction = Math.round((qtySold * conversionFactor) * 1000) / 1000;

      if (!product) {
        throw new Error(`Product not found for stock ID: ${s.stockID}`);
      }

      if (status !== "Held" && status !== "Draft") {
        if (baseStockDeduction > product.remaining) {
          throw new Error(`Insufficient stock for "${product.itemName}". Available: ${product.remaining} ${product.unit || 'pcs'}, Requested: ${baseStockDeduction}`);
        }
      }

      // Accurate profit calculation (Sale Price - Actual Recorded Cost Price for this unit)
      const baseCostRate = (product.costPrice !== undefined && product.costPrice !== null && !isNaN(product.costPrice))
        ? Number(product.costPrice)
        : 0;
      const unitCost = (s.costPrice !== undefined && s.costPrice !== null && !isNaN(s.costPrice) && Number(s.costPrice) > 0)
        ? Number(s.costPrice)
        : (baseCostRate * conversionFactor);

      // Price override RBAC validation & Below-cost protection
      const defaultProductRate = product.salePrice || product.rate || 0;
      const expectedUnitRate = (s.unit && s.unit !== product.unit && product.packagingUnits?.length > 0)
        ? (product.packagingUnits.find(u => u.unitName === s.unit)?.salePrice || (defaultProductRate * conversionFactor))
        : defaultProductRate;
      const isPriceAltered = Math.abs(rateVal - expectedUnitRate) > 0.01;
      const isOverridden = Boolean(s.isPriceOverridden) || isPriceAltered;
      const userRole = req.user?.role || "cashier";
      const canOverride = ["admin", "superadmin", "manager"].includes(userRole);

      if (isOverridden && !canOverride) {
        throw new Error(`Unauthorized price override on "${product.itemName}". Only Admin or Manager can override selling prices.`);
      }

      if (rateVal < unitCost && !["admin", "superadmin"].includes(userRole)) {
        throw new Error(`Cannot sell "${product.itemName}" at ${rateVal}, which is below unit cost price (${unitCost}). Admin authorization required.`);
      }

      const profit = Math.round(((rateVal - unitCost) * qtySold) * 100) / 100;
      const itemSubtotal = (qtySold * rateVal) + (unitTax * qtySold) - (unitDisc * qtySold);
      computedSubtotal += itemSubtotal;

      const uniqueSaleID = s.saleID || `${(product.itemName || "ITM").slice(0, 3).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;

      // FEFO Batch Allocation (First Expiry, First Out)
      let primaryBatch = null;
      if (status !== "Held" && status !== "Draft") {
        const batchAllocations = await ProductBatch.allocateFEFO(
          product._id,
          baseStockDeduction,
          activeBranch._id
        );
        if (batchAllocations && batchAllocations.length > 0) {
          primaryBatch = batchAllocations[0];
          batchAllocations.forEach((ba) => {
            compensationLog.batchAllocations.push({
              batchId: ba.batchId,
              allocatedQty: ba.allocatedQty
            });
          });
        }
      }

      salesToCreate.push({
        brandName: product.brandName || product.brand || s.brandName || "General",
        itemName: product.itemName,
        barcode: s.barcode || product.barcode || product.stockID,
        category: product.category || "General",
        colourName: product.colourName || s.colourName || "",
        qty: product.qty || s.qty || "",
        unit: s.unit || product.unit || "pcs",
        conversionFactor,
        baseQuantity: baseStockDeduction,
        quantitySold: qtySold,
        rate: rateVal,
        unitTax,
        unitDiscount: unitDisc,
        stockID: product.stockID,
        saleID: uniqueSaleID,
        profit,
        branchId: activeBranch._id,
        branchName: activeBranch.name,
        batchId: primaryBatch ? primaryBatch.batchId : null,
        batchNumber: primaryBatch ? primaryBatch.batchNumber : (s.batchNumber || ""),
        expiryDate: primaryBatch ? primaryBatch.expiryDate : null,
        refundQuantity: 0,
        refundStatus: "none",
        isPriceOverridden: isOverridden,
        originalRate: s.originalRate || defaultProductRate,
        overriddenBy: isOverridden ? (req.user?.username || req.user?.fullName || "Admin") : null
      });

      // Decrease stock atomically with gte remaining safeguard
      if (status !== "Held" && status !== "Draft") {
        productUpdates.push({
          updateOne: {
            filter: { _id: product._id, remaining: { $gte: baseStockDeduction } },
            update: { $inc: { remaining: -baseStockDeduction } }
          }
        });
        compensationLog.stockDeductions.push({
          productId: product._id,
          stockID: product.stockID,
          baseStockDeduction,
          branchId: activeBranch._id
        });
      }

      totalQuantityForAgent += qtySold;
      totalAmountForAgent += qtySold * rateVal;
    }

    // 3. Database Execution: Insert sales
    const savedSales = await Sale.insertMany(salesToCreate);
    compensationLog.createdSaleIds = savedSales.map((s) => s._id);

    // Atomic product stock decrement
    if (productUpdates.length > 0) {
      const bulkResult = await Product.bulkWrite(productUpdates);
      if (bulkResult.matchedCount !== productUpdates.length) {
        throw new Error("Concurrent stock conflict detected: One or more products were sold out right before checkout.");
      }
    }

    // Synchronize Location Stock for this Branch
    if (status !== "Held" && status !== "Draft") {
      for (const s of cartList) {
        const product = productMap.get(s.stockID) || 
                        productMap.get(s.productId?.toString()) || 
                        productMap.get(s._id?.toString());
        if (product) {
          const qtySold = parseFloat(s.quantitySold || s.quantity) || 1;
          const factor = parseFloat(s.conversionFactor) || 1;
          const baseDeduction = Math.round((qtySold * factor) * 1000) / 1000;
          await LocationStock.adjustStock(
            activeBranch._id,
            product._id,
            product.stockID,
            -baseDeduction
          );
        }
      }
    }

    // 4. Agent and Customer lookup
    let dbAgent = null;
    if (agentID) {
      dbAgent = await Agent.findOne({ $or: [{ agentID }, { _id: agentID }] });
    }

    let resolvedCustomerId = customerId || null;
    let cust = null;
    if (customerId) {
      cust = await Customer.findById(customerId);
    } else if (customerName && customerName !== "Walk-in Customer") {
      const safeName = escapeRegExp(customerName.trim());
      cust = await Customer.findOne({ name: new RegExp(`^${safeName}$`, "i") });
      if (!cust && customerPhone && customerPhone.trim()) {
        cust = await Customer.findOne({ phone: customerPhone.trim() });
      }
      if (!cust && paymentMethod === "AR Khata / Credit") {
        const count = await Customer.countDocuments();
        const nextId = `CUST-${String(count + 1).padStart(4, "0")}`;
        cust = await Customer.create({
          customerID: nextId,
          name: customerName.trim(),
          phone: customerPhone ? customerPhone.trim() : "",
          currentBalance: 0,
          totalPurchases: 0,
          totalPaid: 0
        });
      }
    }
    if (cust) {
      resolvedCustomerId = cust._id;
    }

    const grandTotal = Math.max(0, computedSubtotal + parseFloat(taxAmount || 0) - parseFloat(discountAmount || 0));
    const roundedGrandTotal = Math.round(grandTotal * 100) / 100;
    const tendered = parseFloat(cashReceived) || 0;

    let initialPaid = 0;
    let initialOutstanding = 0;
    let initialPaymentStatus = "Paid";

    if (paymentMethod === "AR Khata / Credit") {
      if (tendered <= 0) {
        initialPaid = 0;
        initialOutstanding = roundedGrandTotal;
        initialPaymentStatus = "Unpaid";
      } else if (tendered < roundedGrandTotal) {
        initialPaid = Math.round(tendered * 100) / 100;
        initialOutstanding = Math.round((roundedGrandTotal - initialPaid) * 100) / 100;
        initialPaymentStatus = "Partially Paid";
      } else {
        initialPaid = roundedGrandTotal;
        initialOutstanding = 0;
        initialPaymentStatus = "Paid";
      }
    } else {
      // Cash, Card / Bank, Split Payment
      initialPaid = roundedGrandTotal;
      initialOutstanding = 0;
      initialPaymentStatus = "Paid";
    }

    // 5. Create PrintSale (Bill) Record
    const savedBill = await PrintSale.create({
      billID: uniqueBillID,
      idempotencyKey: clientKey || undefined,
      customerName: (customerName && typeof customerName === "string" && customerName.trim()) ? customerName.trim() : "Walk-in Customer",
      customerPhone: (customerPhone && typeof customerPhone === "string" && customerPhone.trim()) ? customerPhone.trim() : "",
      customerId: resolvedCustomerId,
      branchId: activeBranch._id,
      branchName: activeBranch.name,
      salesItems: savedSales.map((s) => s._id),
      agentId: dbAgent ? dbAgent._id : null,
      orderType,
      status,
      paymentMethod,
      paidAmount: initialPaid,
      outstandingAmount: initialOutstanding,
      paymentStatus: initialPaymentStatus,
      payments: initialPaid > 0 ? [
        {
          paymentDate: new Date(),
          amount: initialPaid,
          paymentMethod: paymentMethod === "AR Khata / Credit" ? "Cash" : paymentMethod,
          notes: paymentMethod === "AR Khata / Credit" ? "Down payment at checkout" : "Paid in full at checkout",
          recordedBy: req.user?.username || "Cashier"
        }
      ] : [],
      splitPayment: splitPayment || {
        isSplit: paymentMethod === "Split Payment",
        cashAmount: paymentMethod === "Cash" ? grandTotal : 0,
        bankAmount: paymentMethod === "Card / Bank" ? grandTotal : 0,
        bankProvider: "Card"
      },
      subtotal: Math.round(computedSubtotal * 100) / 100,
      taxAmount: parseFloat(taxAmount) || 0,
      discountAmount: parseFloat(discountAmount) || 0,
      grandTotal: roundedGrandTotal,
      cashReceived: tendered,
      changeDue: parseFloat(changeDue) || 0,
      notes: notes.trim()
    });
    compensationLog.createdBillId = savedBill._id;

    const saleIds = savedSales.map((s) => s._id);

    // Link Sales back to Bill
    await Sale.updateMany({ _id: { $in: saleIds } }, { $set: { billId: savedBill._id } });

    // 6. Agent Commission logic
    const pct = parseFloat(percentage) || 0;
    if (dbAgent && pct > 0) {
      const percentageAmount = Math.round((totalAmountForAgent * pct / 100) * 100) / 100;

      const agentItem = await Item.create({
        agent: dbAgent._id,
        billId: savedBill._id,
        totalProductSold: totalQuantityForAgent,
        totalProductAmount: totalAmountForAgent,
        percentage: pct,
        percentageAmount,
        paidStatus: "Unpaid",
        paidAmount: 0
      });
      compensationLog.createdAgentItemId = agentItem._id;

      await Sale.updateMany({ _id: { $in: saleIds } }, { $set: { agentItemId: agentItem._id } });

      dbAgent.items.push(agentItem._id);
      await dbAgent.save();
    }

    // 7. Customer Khata / AR logic if paymentMethod is "AR Khata / Credit"
    if (paymentMethod === "AR Khata / Credit" && cust) {
      const prevBal = cust.currentBalance;
      cust.currentBalance = Math.round((prevBal + initialOutstanding) * 100) / 100;
      cust.totalPurchases = Math.round(((cust.totalPurchases || 0) + roundedGrandTotal) * 100) / 100;
      cust.totalPaid = Math.round(((cust.totalPaid || 0) + initialPaid) * 100) / 100;
      await cust.save();
      compensationLog.customerKhata = { cust, amount: initialOutstanding };

      const ledgerTx = await LedgerTransaction.create({
        transactionType: "Credit Sale",
        amount: roundedGrandTotal,
        customerId: cust._id,
        customerName: cust.name,
        previousBalance: prevBal,
        newBalance: prevBal + roundedGrandTotal,
        billId: savedBill._id,
        billID: uniqueBillID,
        paymentMethod: "AR Khata / Credit",
        notes: `Credit sale bill ${uniqueBillID}`,
        recordedBy: req.user?.username || "Cashier"
      });
      compensationLog.createdLedgerTxId = ledgerTx._id;

      if (initialPaid > 0) {
        await LedgerTransaction.create({
          transactionType: "Payment Received",
          amount: initialPaid,
          customerId: cust._id,
          customerName: cust.name,
          previousBalance: prevBal + roundedGrandTotal,
          newBalance: cust.currentBalance,
          billId: savedBill._id,
          billID: uniqueBillID,
          paymentMethod: "Cash",
          notes: `Down payment for bill #${uniqueBillID}`,
          recordedBy: req.user?.username || "Cashier"
        });
      }
    } else if (cust) {
      cust.totalPurchases = Math.round(((cust.totalPurchases || 0) + roundedGrandTotal) * 100) / 100;
      cust.totalPaid = Math.round(((cust.totalPaid || 0) + roundedGrandTotal) * 100) / 100;
      await cust.save();
    }

    // 8. Clean up parked held bill if checking out a recalled order
    if (heldBillId && (status === "Completed" || status === "Dispatch")) {
      try {
        const oldHeld = await PrintSale.findById(heldBillId);
        if (oldHeld && (oldHeld.status === "Held" || oldHeld.status === "Draft")) {
          if (oldHeld.salesItems && oldHeld.salesItems.length > 0) {
            await Sale.deleteMany({ _id: { $in: oldHeld.salesItems } });
          }
          await PrintSale.findByIdAndDelete(heldBillId);
        }
      } catch (heldErr) {
        console.warn("Notice: could not clear recalled held bill:", heldErr.message);
      }
    }

    const populatedBill = await PrintSale.findById(savedBill._id)
      .populate("agentId", "name phone")
      .populate("salesItems")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Order completed successfully!",
      billId: savedBill._id,
      billID: uniqueBillID,
      bill: populatedBill || savedBill
    });
  } catch (err) {
    console.error("Sale Processing Error - Executing Compensation Rollback:", err.message);

    // Strict Compensation Rollback to guarantee 100% financial and stock integrity
    // 1. Roll back Product stock
    if (compensationLog.stockDeductions.length > 0) {
      for (const item of compensationLog.stockDeductions) {
        try {
          await Product.updateOne(
            { _id: item.productId },
            { $inc: { remaining: item.baseStockDeduction } }
          );
          if (item.branchId) {
            await LocationStock.adjustStock(
              item.branchId,
              item.productId,
              item.stockID,
              item.baseStockDeduction
            );
          }
        } catch (rbStockErr) {
          console.error("Compensation Error (Stock):", rbStockErr.message);
        }
      }
    }

    // 2. Roll back ProductBatch allocations
    if (compensationLog.batchAllocations.length > 0) {
      for (const ba of compensationLog.batchAllocations) {
        try {
          await ProductBatch.restoreBatch(ba.batchId, ba.allocatedQty);
        } catch (rbBatchErr) {
          console.error("Compensation Error (Batch):", rbBatchErr.message);
        }
      }
    }

    // 3. Roll back inserted Sale documents
    if (compensationLog.createdSaleIds.length > 0) {
      try {
        await Sale.deleteMany({ _id: { $in: compensationLog.createdSaleIds } });
      } catch (rbSaleErr) {
        console.error("Compensation Error (Sales delete):", rbSaleErr.message);
      }
    }

    // 4. Roll back AgentItem
    if (compensationLog.createdAgentItemId) {
      try {
        await Item.findByIdAndDelete(compensationLog.createdAgentItemId);
      } catch (rbItemErr) {
        console.error("Compensation Error (AgentItem):", rbItemErr.message);
      }
    }

    // 5. Roll back Customer Khata & LedgerTransaction
    if (compensationLog.customerKhata) {
      try {
        const { cust, amount } = compensationLog.customerKhata;
        cust.currentBalance -= amount;
        cust.totalPurchases -= amount;
        await cust.save();
      } catch (rbCustErr) {
        console.error("Compensation Error (Customer Khata):", rbCustErr.message);
      }
    }
    if (compensationLog.createdLedgerTxId) {
      try {
        await LedgerTransaction.findByIdAndDelete(compensationLog.createdLedgerTxId);
      } catch (rbTxErr) {
        console.error("Compensation Error (LedgerTx):", rbTxErr.message);
      }
    }

    // 6. Roll back PrintSale
    if (compensationLog.createdBillId) {
      try {
        await PrintSale.findByIdAndDelete(compensationLog.createdBillId);
      } catch (rbBillErr) {
        console.error("Compensation Error (Bill delete):", rbBillErr.message);
      }
    }

    return res.status(400).json({
      success: false,
      message: err.message.includes("E11000")
        ? "Invoice conflict detected. Transaction was rolled back safely."
        : `Sale failed: ${err.message}. Stock was rolled back safely.`
    });
  }
};

// POST /api/sales & /api/sales/checkout (Process and Save Sale)
router.post("/", isLoggedIn, allowRoles("admin", "manager", "cashier"), handleSaleCreation);
router.post("/checkout", isLoggedIn, allowRoles("admin", "manager", "cashier"), handleSaleCreation);

// GET /api/sales/history
router.get("/history", isLoggedIn, async (req, res) => {
  try {
    const { filter = "all", status = "all", agentId, from, to, search, page = 1, limit = 25, all } = req.query;
    let query = {};
    const nowPKT = moment().tz(PKT_TIMEZONE);

    if (filter === "today") {
      query.createdAt = { $gte: nowPKT.clone().startOf("day").toDate(), $lte: nowPKT.clone().endOf("day").toDate() };
    } else if (filter === "yesterday") {
      const yesterday = nowPKT.clone().subtract(1, "days");
      query.createdAt = { $gte: yesterday.startOf("day").toDate(), $lte: yesterday.endOf("day").toDate() };
    } else if (filter === "month") {
      query.createdAt = { $gte: nowPKT.clone().startOf("month").toDate(), $lte: nowPKT.clone().endOf("day").toDate() };
    } else if (filter === "lastMonth") {
      const lastMonth = nowPKT.clone().subtract(1, "months");
      query.createdAt = { $gte: lastMonth.startOf("month").toDate(), $lte: lastMonth.endOf("month").toDate() };
    } else if (filter === "custom" && from && to) {
      query.createdAt = {
        $gte: moment.tz(from, PKT_TIMEZONE).startOf("day").toDate(),
        $lte: moment.tz(to, PKT_TIMEZONE).endOf("day").toDate()
      };
    }

    if (status && status !== "all" && status !== "All") {
      query.status = status;
    }

    if (agentId && agentId !== "all") {
      query.agentId = agentId;
    }

    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(escapeRegExp(search.trim()), "i");
      query.$or = [{ billID: searchRegex }, { customerName: searchRegex }, { customerPhone: searchRegex }];
    }

    const isAll = all === "true" || all === true;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(limit) || 25));
    const skip = (pageNum - 1) * limitNum;

    // Parallel execution for count, revenue aggregate, and paginated documents
    const [totalCount, revenueAgg, history] = await Promise.all([
      PrintSale.countDocuments(query),
      PrintSale.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: { $ifNull: ["$grandTotal", 0] } }
          }
        }
      ]),
      isAll
        ? PrintSale.find(query)
            .populate("agentId", "name phone")
            .populate("salesItems")
            .sort({ createdAt: -1 })
            .lean()
        : PrintSale.find(query)
            .populate("agentId", "name phone")
            .populate("salesItems")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean()
    ]);

    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
    const totalPages = isAll ? 1 : Math.ceil(totalCount / limitNum) || 1;

    history.forEach((bill) => {
      bill.formattedDate = moment(bill.createdAt).tz(PKT_TIMEZONE).format("DD/MM/YYYY");
      bill.formattedTime = moment(bill.createdAt).tz(PKT_TIMEZONE).format("hh:mm A");

      let billTotal = 0;
      if (bill.salesItems && bill.salesItems.length > 0) {
        bill.salesItems.forEach((item) => {
          const actualQty = (item.quantitySold || 0) - (item.refundQuantity || 0);
          billTotal += actualQty * (item.rate || 0);
        });
      } else if (bill.grandTotal) {
        billTotal = bill.grandTotal;
      }
      bill.computedTotal = billTotal;
    });

    return res.json({
      success: true,
      history,
      totalRevenue: Math.round(totalRevenue),
      count: totalCount,
      pagination: {
        page: isAll ? 1 : pageNum,
        limit: isAll ? totalCount : limitNum,
        totalPages,
        totalOrders: totalCount,
        hasPrevPage: !isAll && pageNum > 1,
        hasNextPage: !isAll && pageNum < totalPages
      }
    });
  } catch (err) {
    console.error("Sales History Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/sales/bill/:id
router.get("/bill/:id", isLoggedIn, async (req, res) => {
  try {
    const bill = await PrintSale.findById(req.params.id)
      .populate({
        path: "salesItems",
        select: "stockID saleID itemName brandName refundQuantity colourName qty unit quantitySold rate createdAt"
      })
      .populate("agentId", "name phone")
      .lean();

    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found." });
    }

    const totalAmount = bill.salesItems.reduce((acc, item) => {
      const itemRate = item.rate || 0;
      const actualQty = (item.quantitySold || 0) - (item.refundQuantity || 0);
      return acc + actualQty * itemRate;
    }, 0);

    bill.formattedDate = moment(bill.createdAt).tz(PKT_TIMEZONE).format("DD/MM/YYYY");
    bill.formattedTime = moment(bill.createdAt).tz(PKT_TIMEZONE).format("hh:mm A");

    return res.json({
      success: true,
      bill,
      totalAmount
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/sales/bill/:id
router.delete("/bill/:id", isLoggedIn, allowRoles("admin"), async (req, res) => {
  try {
    const bill = await PrintSale.findById(req.params.id).populate("salesItems");
    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found." });
    }

    // 1. If bill was active (not Held or Draft), restore unrefunded stock to inventory
    // Safety requirement: Never double-restock previously refunded quantities
    if (bill.status !== "Held" && bill.status !== "Draft" && bill.salesItems && bill.salesItems.length > 0) {
      for (const item of bill.salesItems) {
        const unrefundedQty = Math.max(0, (item.quantitySold || 0) - (item.refundQuantity || 0));
        if (unrefundedQty > 0) {
          const factor = parseFloat(item.conversionFactor) || 1;
          const baseQtyToRestore = Math.round((unrefundedQty * factor) * 1000) / 1000;
          const product = await Product.findOne({
            $or: [{ stockID: item.stockID }, { barcode: item.barcode }]
          });

          if (product) {
            const prevStock = product.remaining;
            product.remaining = Math.round((product.remaining + baseQtyToRestore) * 1000) / 1000;
            await product.save();

            // Restore Location Stock for the bill's branch
            if (bill.branchId) {
              await LocationStock.adjustStock(
                bill.branchId,
                product._id,
                product.stockID,
                baseQtyToRestore
              );
            }

            // Restore batch quantity if item was linked to a batch
            if (item.batchId) {
              await ProductBatch.restoreBatch(item.batchId, baseQtyToRestore);
            }

            await StockAudit.create({
              productId: product._id,
              itemName: product.itemName,
              barcode: product.barcode || product.stockID,
              adjustmentType: "Audit Correction",
              previousQuantity: prevStock,
              changeQuantity: baseQtyToRestore,
              newQuantity: product.remaining,
              reason: `Voided bill #${bill.billID} - returned ${unrefundedQty} ${item.unit || 'pcs'} (${baseQtyToRestore} base ${product.unit || 'pcs'}) to stock`,
              adjustedBy: req.user?.username || "Admin",
              branchId: bill.branchId || null,
              branchName: bill.branchName || ""
            });
          }
        }
      }
    }

    // 2. If bill was an AR Khata / Credit sale, reverse the customer balance
    if (bill.paymentMethod === "AR Khata / Credit" && bill.status !== "Held" && bill.status !== "Draft") {
      const unrefundedCredit = Math.max(0, bill.outstandingAmount !== undefined ? bill.outstandingAmount : ((bill.grandTotal || 0) - (bill.refundAmount || 0)));
      if (unrefundedCredit > 0) {
        let cust = null;
        if (bill.customerId) {
          cust = await Customer.findById(bill.customerId);
        } else if (bill.customerName && bill.customerName !== "Walk-in Customer") {
          cust = await Customer.findOne({ name: bill.customerName.trim() });
        }

        if (cust) {
          const prevBal = cust.currentBalance;
          cust.currentBalance = Math.max(0, prevBal - unrefundedCredit);
          cust.totalPurchases = Math.max(0, (cust.totalPurchases || 0) - unrefundedCredit);
          await cust.save();

          await LedgerTransaction.create({
            transactionType: "Refund Adjustment",
            amount: unrefundedCredit,
            customerId: cust._id,
            customerName: cust.name,
            previousBalance: prevBal,
            newBalance: cust.currentBalance,
            billId: bill._id,
            billID: bill.billID,
            paymentMethod: "AR Khata / Credit",
            notes: `Credit reversal: Voided bill #${bill.billID}`,
            recordedBy: req.user?.username || "Admin"
          });
        }
      }
    }

    // 3. Delete associated sales records
    if (bill.salesItems && bill.salesItems.length > 0) {
      await Sale.deleteMany({ _id: { $in: bill.salesItems.map((s) => s._id || s) } });
    }

    // 4. Delete the bill itself
    await PrintSale.findByIdAndDelete(req.params.id);
    return res.json({
      success: true,
      message: `Bill #${bill.billID} voided and deleted successfully. Stock & balances restored.`
    });
  } catch (err) {
    console.error("Bill Deletion Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/sales/refund & /api/sales/company-refund (Customer Return / Refund)
const handleRefund = async (req, res) => {
  try {
    let { stockID, saleID, productQuantity, quantity, refundAmount, billId, reason = "" } = req.body;
    saleID = saleID ? saleID.trim() : "";
    stockID = stockID ? stockID.trim() : "";
    const qty = parseFloat(productQuantity || quantity) || 1;

    // =========================================================================
    // CASE 1: WHOLE-BILL REFUND (when billId is provided without single item)
    // =========================================================================
    if ((!stockID || !saleID) && billId) {
      const bill = await PrintSale.findById(billId).populate("salesItems");
      if (!bill) {
        return res.status(404).json({ success: false, message: "Bill not found for refund." });
      }

      if (bill.status === "Refunded") {
        return res.status(400).json({ success: false, message: `Bill #${bill.billID} has already been fully refunded.` });
      }

      let totalCalculatedRefund = 0;
      let itemsRestockedCount = 0;

      // Iterate through EVERY item on the bill to restore accurate stock
      if (bill.salesItems && bill.salesItems.length > 0) {
        for (const item of bill.salesItems) {
          // Strictly prevent double-restocking: only refund what has not been refunded yet
          const unrefundedQty = Math.max(0, (item.quantitySold || 0) - (item.refundQuantity || 0));
          if (unrefundedQty > 0) {
            const factor = parseFloat(item.conversionFactor) || 1;
            const baseQtyToRestore = Math.round((unrefundedQty * factor) * 1000) / 1000;
            const product = await Product.findOne({
              $or: [{ stockID: item.stockID }, { barcode: item.barcode }]
            });

            if (product) {
              const prevStock = product.remaining;
              product.remaining = Math.round((product.remaining + baseQtyToRestore) * 1000) / 1000;
              await product.save();

              // Restore Location Stock for the bill's branch
              if (bill.branchId) {
                await LocationStock.adjustStock(
                  bill.branchId,
                  product._id,
                  product.stockID,
                  baseQtyToRestore
                );
              }

              // Restore batch quantity if item was linked to a batch
              if (item.batchId) {
                await ProductBatch.restoreBatch(item.batchId, baseQtyToRestore);
              }

              await StockAudit.create({
                productId: product._id,
                itemName: product.itemName,
                barcode: product.barcode || product.stockID,
                adjustmentType: "Returned from Customer",
                previousQuantity: prevStock,
                changeQuantity: baseQtyToRestore,
                newQuantity: product.remaining,
                reason: `Customer return bill #${bill.billID}: ${reason || "Bill-level return"} (${unrefundedQty} ${item.unit || 'pcs'})`,
                adjustedBy: req.user?.username || "Cashier",
                branchId: bill.branchId || null,
                branchName: bill.branchName || ""
              });
            }

            const itemLineTotal = unrefundedQty * (item.rate || 0);
            totalCalculatedRefund += itemLineTotal;
            itemsRestockedCount += unrefundedQty;

            // Recalculate profit adjustment accurately (no 25% guessing)
            const purchaseRate = (product && product.costPrice !== undefined && product.costPrice !== null)
              ? Number(product.costPrice)
              : 0;
            const refundProfit = parseFloat(((item.rate - purchaseRate) * unrefundedQty).toFixed(2));
            item.profit = Math.max(0, parseFloat(((item.profit || 0) - refundProfit).toFixed(2)));

            item.refundQuantity = (item.refundQuantity || 0) + unrefundedQty;
            item.refundStatus = "Fully Refunded";
            await item.save();

            // Deduct agent commission if applicable
            if (item.agentItemId) {
              const agentItem = await Item.findById(item.agentItemId);
              if (agentItem) {
                agentItem.totalProductSold = Math.max(0, agentItem.totalProductSold - unrefundedQty);
                agentItem.totalProductAmount = Math.max(0, agentItem.totalProductAmount - itemLineTotal);
                const newCommission = (agentItem.totalProductAmount * agentItem.percentage) / 100;
                agentItem.percentageAmount = Math.round(newCommission * 100) / 100;
                if (agentItem.paidAmount >= agentItem.percentageAmount) agentItem.paidStatus = "Paid";
                else if (agentItem.paidAmount > 0) agentItem.paidStatus = "Partial";
                else agentItem.paidStatus = "Unpaid";
                await agentItem.save();
              }
            }
          }
        }
      }

      // If bill was an AR Khata / Credit sale, reverse the customer balance
      if (bill.paymentMethod === "AR Khata / Credit" && totalCalculatedRefund > 0) {
        let cust = null;
        if (bill.customerId) {
          cust = await Customer.findById(bill.customerId);
        } else if (bill.customerName && bill.customerName !== "Walk-in Customer") {
          cust = await Customer.findOne({ name: bill.customerName.trim() });
        }

        if (cust) {
          const prevBal = cust.currentBalance;
          cust.currentBalance = Math.max(0, prevBal - totalCalculatedRefund);
          cust.totalPurchases = Math.max(0, (cust.totalPurchases || 0) - totalCalculatedRefund);
          await cust.save();

          await LedgerTransaction.create({
            transactionType: "Refund Adjustment",
            amount: totalCalculatedRefund,
            customerId: cust._id,
            customerName: cust.name,
            previousBalance: prevBal,
            newBalance: cust.currentBalance,
            billId: bill._id,
            billID: bill.billID,
            paymentMethod: "AR Khata / Credit",
            notes: `Khata credit reversed for refunded bill #${bill.billID}`,
            recordedBy: req.user?.username || "Cashier"
          });
        }
      }

      bill.refundAmount = (bill.refundAmount || 0) + totalCalculatedRefund;
      bill.refundReason = reason || "Customer Return";
      bill.status = "Refunded";
      await bill.save();

      return res.json({
        success: true,
        message: `Bill #${bill.billID} refund processed successfully! ${itemsRestockedCount} items returned to inventory.`,
        bill
      });
    }

    // =========================================================================
    // CASE 2: SINGLE LINE-ITEM REFUND (by stockID & saleID)
    // =========================================================================
    if (!stockID || !qty || qty <= 0) {
      return res.status(400).json({ success: false, message: "Valid Stock ID and Refund Quantity are required." });
    }

    const sale = await Sale.findOne({ stockID, saleID });
    const product = await Product.findOne({ stockID });

    if (!sale || !product) {
      return res.status(404).json({ success: false, message: "Sale item or product not found." });
    }

    const maxRefundable = sale.quantitySold - (sale.refundQuantity || 0);
    if (qty > maxRefundable) {
      return res.status(400).json({
        success: false,
        message: `Refund quantity exceeds sold quantity. Max allowed: ${maxRefundable}`
      });
    }

    const itemRefundAmount = qty * sale.rate;
    // Accurate purchase rate calculation (no 25% guessing)
    const purchaseRate = (product.costPrice !== undefined && product.costPrice !== null)
      ? Number(product.costPrice)
      : 0;
    const refundProfit = parseFloat(((sale.rate - purchaseRate) * qty).toFixed(2));

    sale.profit = Math.max(0, parseFloat(((sale.profit || 0) - refundProfit).toFixed(2)));
    sale.refundQuantity = (sale.refundQuantity || 0) + qty;
    sale.refundStatus = sale.refundQuantity >= sale.quantitySold ? "Fully Refunded" : "Partially Refunded";
    await sale.save();

    // Restock product accurately using conversionFactor
    const factor = parseFloat(sale.conversionFactor) || 1;
    const baseQtyToRestore = Math.round((qty * factor) * 1000) / 1000;
    const prevStock = product.remaining;
    product.remaining = Math.round((product.remaining + baseQtyToRestore) * 1000) / 1000;
    await product.save();

    // Restore Location Stock for the sale's branch
    if (sale.branchId) {
      await LocationStock.adjustStock(
        sale.branchId,
        product._id,
        product.stockID,
        baseQtyToRestore
      );
    }

    // Restore batch quantity if sale was linked to a batch
    if (sale.batchId) {
      await ProductBatch.restoreBatch(sale.batchId, baseQtyToRestore);
    }

    // Log StockAudit for transparency
    await StockAudit.create({
      productId: product._id,
      itemName: product.itemName,
      barcode: product.barcode || product.stockID,
      adjustmentType: "Returned from Customer",
      previousQuantity: prevStock,
      changeQuantity: baseQtyToRestore,
      newQuantity: product.remaining,
      reason: `Customer return (${qty} ${sale.unit || 'pcs'} [${baseQtyToRestore} base ${product.unit || 'pcs'}] of ${sale.itemName}): ${reason || "Item refund"}`,
      adjustedBy: req.user?.username || "Cashier",
      branchId: sale.branchId || null,
      branchName: sale.branchName || ""
    });

    // Update parent bill status and refundAmount
    if (sale.billId) {
      const parentBill = await PrintSale.findById(sale.billId).populate("salesItems");
      if (parentBill) {
        parentBill.refundAmount = (parentBill.refundAmount || 0) + itemRefundAmount;
        const allItemsFullyRefunded = (parentBill.salesItems || []).length > 0 &&
          parentBill.salesItems.every((it) => it.refundStatus === "Fully Refunded");
        if (allItemsFullyRefunded) {
          parentBill.status = "Refunded";
        }
        await parentBill.save();

        // If parent bill was AR Khata, reverse customer credit
        if (parentBill.paymentMethod === "AR Khata / Credit") {
          let cust = null;
          if (parentBill.customerId) {
            cust = await Customer.findById(parentBill.customerId);
          } else if (parentBill.customerName && parentBill.customerName !== "Walk-in Customer") {
            cust = await Customer.findOne({ name: parentBill.customerName.trim() });
          }

          if (cust) {
            const prevBal = cust.currentBalance;
            cust.currentBalance = Math.max(0, prevBal - itemRefundAmount);
            cust.totalPurchases = Math.max(0, (cust.totalPurchases || 0) - itemRefundAmount);
            await cust.save();

            await LedgerTransaction.create({
              transactionType: "Refund Adjustment",
              amount: itemRefundAmount,
              customerId: cust._id,
              customerName: cust.name,
              previousBalance: prevBal,
              newBalance: cust.currentBalance,
              billId: parentBill._id,
              billID: parentBill.billID,
              paymentMethod: "AR Khata / Credit",
              notes: `Partial credit reversal: Returned ${qty} ${sale.itemName} from bill #${parentBill.billID}`,
              recordedBy: req.user?.username || "Cashier"
            });
          }
        }
      }
    }

    // Deduct agent commission if applicable
    if (sale.agentItemId) {
      const agentItem = await Item.findById(sale.agentItemId);
      if (agentItem) {
        agentItem.totalProductSold = Math.max(0, agentItem.totalProductSold - qty);
        agentItem.totalProductAmount = Math.max(0, agentItem.totalProductAmount - itemRefundAmount);

        const newCommission = (agentItem.totalProductAmount * agentItem.percentage) / 100;
        agentItem.percentageAmount = Math.round(newCommission * 100) / 100;

        if (agentItem.paidAmount >= agentItem.percentageAmount) {
          agentItem.paidStatus = "Paid";
        } else if (agentItem.paidAmount > 0) {
          agentItem.paidStatus = "Partial";
        } else {
          agentItem.paidStatus = "Unpaid";
        }
        await agentItem.save();
      }
    }

    return res.json({
      success: true,
      message: `Refund processed successfully! ${qty} ${sale.unit || 'items'} returned to inventory.`,
      billId: sale.billId || null
    });
  } catch (err) {
    console.error("Refund Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.post("/refund", isLoggedIn, allowRoles("admin", "manager"), handleRefund);
router.post("/company-refund", isLoggedIn, allowRoles("admin", "manager"), handleRefund);

// GET /api/sales/held-bills
router.get("/held-bills", isLoggedIn, async (req, res) => {
  try {
    const held = await PrintSale.find({ status: "Held" })
      .populate("salesItems")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, heldBills: held });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/sales/analytics (All Sales & Profit Analysis - Admin, Manager, Accountant)
router.get("/analytics", isLoggedIn, allowRoles("admin", "manager", "accountant"), async (req, res) => {
  try {
    const { filter = "month", from, to, brand, itemName } = req.query;
    let query = {};
    const nowPKT = moment().tz(PKT_TIMEZONE);

    if (filter === "today") {
      query.createdAt = { $gte: nowPKT.clone().startOf("day").toDate(), $lte: nowPKT.clone().endOf("day").toDate() };
    } else if (filter === "yesterday") {
      const yesterdayPKT = nowPKT.clone().subtract(1, "days");
      query.createdAt = { $gte: yesterdayPKT.startOf("day").toDate(), $lte: yesterdayPKT.endOf("day").toDate() };
    } else if (filter === "month") {
      query.createdAt = { $gte: nowPKT.clone().startOf("month").toDate(), $lte: nowPKT.clone().endOf("day").toDate() };
    } else if (filter === "lastMonth") {
      const lastMonthPKT = nowPKT.clone().subtract(1, "months");
      query.createdAt = { $gte: lastMonthPKT.startOf("month").toDate(), $lte: lastMonthPKT.endOf("month").toDate() };
    } else if (filter === "custom" && from && to) {
      query.createdAt = {
        $gte: moment.tz(from, "YYYY-MM-DD", PKT_TIMEZONE).startOf("day").toDate(),
        $lte: moment.tz(to, "YYYY-MM-DD", PKT_TIMEZONE).endOf("day").toDate()
      };
    }

    if (brand && brand !== "all") query.brandName = new RegExp(`^${escapeRegExp(brand)}$`, "i");
    if (itemName && itemName !== "all") query.itemName = new RegExp(`^${escapeRegExp(itemName)}$`, "i");

    const sales = await Sale.find(query).sort({ createdAt: -1 }).lean();

    let totalSold = 0;
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalLoss = 0;
    let totalRefunded = 0;

    sales.forEach((s) => {
      const netSold = s.quantitySold || 0;
      totalSold += netSold;
      totalRevenue += netSold * (s.rate || 0);
      totalRefunded += (s.refundQuantity || 0) * (s.rate || 0);

      if (s.profit > 0) totalProfit += s.profit;
      else totalLoss += Math.abs(s.profit || 0);
    });

    return res.json({
      success: true,
      sales,
      stats: {
        totalSold,
        totalRevenue: Math.round(totalRevenue),
        totalProfit: Math.round(totalProfit),
        totalLoss: Math.round(totalLoss),
        totalRefunded: Math.round(totalRefunded),
        netProfit: Math.round(totalProfit - totalLoss)
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

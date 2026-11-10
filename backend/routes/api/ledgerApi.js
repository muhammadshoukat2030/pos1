import express from "express";
import moment from "moment-timezone";
import Customer from "../../models/Customer.js";
import Supplier from "../../models/Supplier.js";
import LedgerTransaction from "../../models/LedgerTransaction.js";
import PrintSale from "../../models/PrintSale.js";
import { isLoggedIn } from "../../middleware/isLoggedIn.js";
import { allowRoles } from "../../middleware/allowRoles.js";

const router = express.Router();
const PKT_TIMEZONE = "Asia/Karachi";

function escapeRegExp(string) {
  if (!string) return "";
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/ledger/summary
router.get("/summary", isLoggedIn, allowRoles("admin", "manager", "accountant", "cashier", "worker"), async (req, res) => {
  try {
    const nowPKT = moment().tz(PKT_TIMEZONE);
    const startOfToday = nowPKT.clone().startOf("day").toDate();
    const endOfToday = nowPKT.clone().endOf("day").toDate();

    const [customers, suppliers, todayTransactions, allTransactions] = await Promise.all([
      Customer.find({}).lean(),
      Supplier.find({}).lean(),
      LedgerTransaction.find({ date: { $gte: startOfToday, $lte: endOfToday } }).lean(),
      LedgerTransaction.find({}).sort({ date: -1 }).limit(10).lean()
    ]);

    let totalReceivable = 0; // Customer Khata due
    customers.forEach((c) => {
      if (c.currentBalance > 0) totalReceivable += c.currentBalance;
    });

    let totalPayable = 0; // Supplier Payables
    suppliers.forEach((s) => {
      if (s.balanceDue > 0) totalPayable += s.balanceDue;
    });

    let todayCashIn = 0;
    let todayCashOut = 0;

    todayTransactions.forEach((t) => {
      if (t.transactionType === "Payment Received") {
        todayCashIn += t.amount || 0;
      } else if (t.transactionType === "Cash Expense" || t.transactionType === "Supplier Payment") {
        todayCashOut += t.amount || 0;
      }
    });

    return res.json({
      success: true,
      summary: {
        totalReceivable: Math.round(totalReceivable),
        totalPayable: Math.round(totalPayable),
        todayCashIn: Math.round(todayCashIn),
        todayCashOut: Math.round(todayCashOut),
        netCashFlow: Math.round(todayCashIn - todayCashOut),
        totalCustomers: customers.length,
        totalSuppliers: suppliers.length
      },
      recentTransactions: allTransactions
    });
  } catch (err) {
    console.error("Ledger Summary Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/ledger/customers
router.get("/customers", isLoggedIn, async (req, res) => {
  try {
    const { search, filter } = req.query;
    let query = {};
    if (search && search.trim() !== "") {
      const safeTerm = escapeRegExp(search.trim());
      const regex = new RegExp(safeTerm, "i");
      query.$or = [{ name: regex }, { phone: regex }, { cnic: regex }, { customerID: regex }];
    }

    if (filter === "debtors" || filter === "pending") {
      query.currentBalance = { $gt: 0 };
    }

    const customers = await Customer.find(query).sort({ currentBalance: -1, name: 1 }).lean();

    // Ensure all customers have customerID if missing
    for (let i = 0; i < customers.length; i++) {
      if (!customers[i].customerID) {
        const genId = `CUST-${String(i + 1).padStart(4, "0")}`;
        customers[i].customerID = genId;
        await Customer.findByIdAndUpdate(customers[i]._id, { customerID: genId });
      }
    }

    return res.json({ success: true, customers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ledger/customers & /api/ledger/customer
const handleCreateCustomer = async (req, res) => {
  try {
    const { name, phone, cnic, address, creditLimit = 50000, initialBalance = 0, openingBalance, notes } = req.body;
    const effectiveBalance = initialBalance !== undefined ? initialBalance : (openingBalance !== undefined ? openingBalance : 0);

    if (!name || name.trim() === "") {
      return res.status(400).json({ success: false, message: "Customer name is required." });
    }

    const cleanName = name.trim();
    const cleanPhone = phone ? phone.trim() : "";

    // Check duplicate customer by name (case-insensitive) or phone
    const duplicateQuery = [{ name: new RegExp(`^${escapeRegExp(cleanName)}$`, "i") }];
    if (cleanPhone) {
      duplicateQuery.push({ phone: cleanPhone });
    }
    const existing = await Customer.findOne({ $or: duplicateQuery });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Customer already exists (${existing.name} - ID: ${existing.customerID || "Assigned"}). Please select from existing customers.`,
        customer: existing
      });
    }

    const count = await Customer.countDocuments();
    const customerID = `CUST-${String(count + 1).padStart(4, "0")}`;

    const customer = await Customer.create({
      customerID,
      name: cleanName,
      phone: cleanPhone,
      cnic: cnic ? cnic.trim() : "",
      address: address ? address.trim() : "",
      creditLimit: parseFloat(creditLimit) || 50000,
      currentBalance: parseFloat(effectiveBalance) || 0,
      totalPurchases: parseFloat(effectiveBalance) || 0,
      totalPaid: 0,
      notes: notes || ""
    });

    if (parseFloat(effectiveBalance) > 0) {
      await LedgerTransaction.create({
        transactionType: "Credit Sale",
        amount: parseFloat(effectiveBalance),
        customerId: customer._id,
        customerName: customer.name,
        previousBalance: 0,
        newBalance: parseFloat(effectiveBalance),
        paymentMethod: "AR Khata / Credit",
        notes: "Opening credit balance",
        recordedBy: req.user?.username || "Admin"
      });
    }

    return res.status(201).json({ success: true, message: "Customer created successfully!", customer });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.post("/customers", isLoggedIn, allowRoles("admin", "manager", "accountant", "cashier"), handleCreateCustomer);
router.post("/customer", isLoggedIn, allowRoles("admin", "manager", "accountant", "cashier"), handleCreateCustomer);

// GET /api/ledger/customers/:id
router.get("/customers/:id", isLoggedIn, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }

    if (!customer.customerID) {
      const count = await Customer.countDocuments();
      customer.customerID = `CUST-${String(count + 1).padStart(4, "0")}`;
      await customer.save();
    }

    // 1. Fetch all customer bills from PrintSale
    const rawBills = await PrintSale.find({
      $or: [{ customerId: customer._id }, { customerName: customer.name }]
    })
      .populate("salesItems", "itemName quantitySold unit rate lineTotal")
      .sort({ createdAt: -1 })
      .lean();

    // 2. Normalize and compute bill fields
    const bills = rawBills.map((b) => {
      const gTotal = Math.round((b.grandTotal || 0) * 100) / 100;
      let pAmount = b.paidAmount !== undefined ? b.paidAmount : (b.paymentMethod === "AR Khata / Credit" ? (b.cashReceived || 0) : gTotal);
      let oAmount = b.outstandingAmount !== undefined ? b.outstandingAmount : (b.paymentMethod === "AR Khata / Credit" ? Math.max(0, gTotal - pAmount) : 0);
      let status = b.paymentStatus;
      if (!status) {
        if (oAmount <= 0.01) status = "Paid";
        else if (pAmount > 0) status = "Partially Paid";
        else status = "Unpaid";
      }

      return {
        ...b,
        grandTotal: gTotal,
        paidAmount: Math.round(pAmount * 100) / 100,
        outstandingAmount: Math.round(oAmount * 100) / 100,
        paymentStatus: status,
        payments: b.payments || []
      };
    });

    // 3. Fetch all payment transactions from LedgerTransaction
    const payments = await LedgerTransaction.find({
      customerId: customer._id,
      transactionType: "Payment Received"
    })
      .sort({ date: -1 })
      .lean();

    // 4. Fetch all general ledger entries for this customer
    const transactions = await LedgerTransaction.find({ customerId: customer._id })
      .sort({ date: -1 })
      .lean();

    // 5. Compute real-time Account Summary
    let totalBillsAmount = 0;
    let totalPaidFromBills = 0;
    bills.forEach((b) => {
      totalBillsAmount += b.grandTotal;
      totalPaidFromBills += b.paidAmount;
    });

    const totalPaidSum = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const effectiveTotalPaid = Math.max(totalPaidFromBills, totalPaidSum, customer.totalPaid || 0);

    const summary = {
      totalBills: Math.round(totalBillsAmount * 100) / 100,
      totalPaid: Math.round(effectiveTotalPaid * 100) / 100,
      totalOutstanding: Math.round((customer.currentBalance || 0) * 100) / 100,
      totalBillsCount: bills.length
    };

    return res.json({
      success: true,
      customer: customer.toObject ? customer.toObject() : customer,
      summary,
      bills,
      payments,
      transactions
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ledger/cash-in & /api/ledger/customer-payment (Customer payment received against Khata)
const handleCashIn = async (req, res) => {
  try {
    const { customerId, amount, paymentMethod = "Cash", paymentMode, billId, referenceNumber = "", notes = "" } = req.body;
    const paidAmount = parseFloat(amount);
    const mode = paymentMode || paymentMethod || "Cash";

    if (!customerId || isNaN(paidAmount) || paidAmount <= 0) {
      return res.status(400).json({ success: false, message: "Valid customer and positive payment amount are required." });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }

    let remainingToAllocate = paidAmount;
    let targetedBill = null;

    // 1. If specific bill is selected, allocate to that bill first
    if (billId) {
      targetedBill = await PrintSale.findById(billId);
      if (targetedBill) {
        const curPaid = targetedBill.paidAmount !== undefined ? targetedBill.paidAmount : (targetedBill.cashReceived || 0);
        const curOutstanding = targetedBill.outstandingAmount !== undefined ? targetedBill.outstandingAmount : Math.max(0, (targetedBill.grandTotal || 0) - curPaid);

        const allocateToBill = Math.min(curOutstanding, remainingToAllocate);
        targetedBill.paidAmount = Math.round((curPaid + allocateToBill) * 100) / 100;
        targetedBill.outstandingAmount = Math.max(0, Math.round((targetedBill.grandTotal - targetedBill.paidAmount) * 100) / 100);
        targetedBill.paymentStatus = targetedBill.outstandingAmount <= 0.01 ? "Paid" : "Partially Paid";
        
        if (!targetedBill.payments) targetedBill.payments = [];
        targetedBill.payments.push({
          paymentDate: new Date(),
          amount: allocateToBill,
          paymentMethod: mode,
          referenceNumber: referenceNumber.trim(),
          notes: notes.trim() || `Payment received for bill #${targetedBill.billID}`,
          recordedBy: req.user?.username || "Cashier"
        });

        await targetedBill.save();
        remainingToAllocate = Math.round((remainingToAllocate - allocateToBill) * 100) / 100;
      }
    }

    // 2. If general payment or remainder left, allocate FIFO across unpaid/partially paid bills
    if (remainingToAllocate > 0) {
      const unpaidBills = await PrintSale.find({
        $or: [{ customerId: customer._id }, { customerName: customer.name }],
        _id: targetedBill ? { $ne: targetedBill._id } : { $exists: true },
        paymentStatus: { $in: ["Unpaid", "Partially Paid"] }
      }).sort({ createdAt: 1 });

      for (const bill of unpaidBills) {
        if (remainingToAllocate <= 0) break;
        const curPaid = bill.paidAmount !== undefined ? bill.paidAmount : (bill.cashReceived || 0);
        const curOutstanding = bill.outstandingAmount !== undefined ? bill.outstandingAmount : Math.max(0, (bill.grandTotal || 0) - curPaid);

        if (curOutstanding > 0) {
          const alloc = Math.min(curOutstanding, remainingToAllocate);
          bill.paidAmount = Math.round((curPaid + alloc) * 100) / 100;
          bill.outstandingAmount = Math.max(0, Math.round((bill.grandTotal - bill.paidAmount) * 100) / 100);
          bill.paymentStatus = bill.outstandingAmount <= 0.01 ? "Paid" : "Partially Paid";

          if (!bill.payments) bill.payments = [];
          bill.payments.push({
            paymentDate: new Date(),
            amount: alloc,
            paymentMethod: mode,
            referenceNumber: referenceNumber.trim(),
            notes: notes.trim() || `Payment received for bill #${bill.billID}`,
            recordedBy: req.user?.username || "Cashier"
          });

          await bill.save();
          remainingToAllocate = Math.round((remainingToAllocate - alloc) * 100) / 100;
        }
      }
    }

    // 3. Update customer balance and totalPaid
    const prevBal = customer.currentBalance;
    customer.currentBalance = Math.max(0, Math.round((prevBal - paidAmount) * 100) / 100);
    customer.totalPaid = Math.round(((customer.totalPaid || 0) + paidAmount) * 100) / 100;
    await customer.save();

    // 4. Create LedgerTransaction
    const transaction = await LedgerTransaction.create({
      transactionType: "Payment Received",
      amount: paidAmount,
      customerId: customer._id,
      customerName: customer.name,
      previousBalance: prevBal,
      newBalance: customer.currentBalance,
      billId: targetedBill ? targetedBill._id : null,
      billID: targetedBill ? targetedBill.billID : "",
      paymentMethod: mode,
      referenceNumber: referenceNumber.trim(),
      notes: notes.trim() || `Khata payment received from ${customer.name}${targetedBill ? ` (Bill #${targetedBill.billID})` : ""}`,
      recordedBy: req.user?.username || "Cashier"
    });

    return res.json({
      success: true,
      message: `Payment of PKR ${paidAmount.toLocaleString()} recorded for ${customer.name}. New Balance: PKR ${customer.currentBalance.toLocaleString()}`,
      customer,
      transaction
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.post("/cash-in", isLoggedIn, allowRoles("admin", "manager", "accountant", "cashier"), handleCashIn);
router.post("/customer-payment", isLoggedIn, allowRoles("admin", "manager", "accountant", "cashier"), handleCashIn);

// POST /api/ledger/cash-out (Store Expense - Restricted to Admin, Manager, Accountant)
const handleCashOut = async (req, res) => {
  try {
    const { amount, expenseCategory = "Other", category, paymentMethod = "Cash", referenceNumber = "", notes = "", description = "" } = req.body;
    const expenseAmount = parseFloat(amount);
    const cat = category || expenseCategory;

    if (isNaN(expenseAmount) || expenseAmount <= 0) {
      return res.status(400).json({ success: false, message: "Valid expense amount is required." });
    }

    const transaction = await LedgerTransaction.create({
      transactionType: "Cash Expense",
      amount: expenseAmount,
      expenseCategory: cat,
      paymentMethod,
      referenceNumber: referenceNumber.trim(),
      notes: (description || notes).trim() || `${cat} expense`,
      recordedBy: req.user?.username || "Staff"
    });

    return res.json({
      success: true,
      message: `Expense of PKR ${expenseAmount.toLocaleString()} (${cat}) recorded successfully.`,
      transaction,
      entry: transaction
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.post("/cash-out", isLoggedIn, allowRoles("admin", "manager", "accountant"), handleCashOut);

// POST /api/ledger/cash-transaction (Generic in/out router)
router.post("/cash-transaction", isLoggedIn, allowRoles("admin", "manager", "accountant", "cashier"), async (req, res) => {
  const { type, customerId } = req.body;
  if (type === "In" && customerId) {
    return handleCashIn(req, res);
  }
  // If cash out, check role permissions
  if (!["superadmin", "admin", "manager", "accountant"].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Cashiers are not permitted to record cash-out expenses." });
  }
  return handleCashOut(req, res);
});

// GET /api/ledger/transactions
router.get("/transactions", isLoggedIn, allowRoles("admin", "manager", "accountant", "cashier", "worker"), async (req, res) => {
  try {
    const { type, from, to, customerId, supplierId, limit = 100 } = req.query;
    let query = {};

    if (type && type !== "all" && type !== "All") {
      query.transactionType = type;
    }
    if (customerId) {
      query.customerId = customerId;
    }
    if (supplierId) {
      query.supplierId = supplierId;
    }
    if (from && to) {
      query.date = {
        $gte: moment.tz(from, PKT_TIMEZONE).startOf("day").toDate(),
        $lte: moment.tz(to, PKT_TIMEZONE).endOf("day").toDate()
      };
    }

    const transactions = await LedgerTransaction.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .lean();

    return res.json({ success: true, transactions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/ledger/suppliers
router.get("/suppliers", isLoggedIn, allowRoles("admin", "manager", "accountant", "cashier", "worker"), async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ balanceDue: -1, name: 1 }).lean();
    return res.json({ success: true, suppliers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ledger/suppliers (Admin, Manager, Accountant)
router.post("/suppliers", isLoggedIn, allowRoles("admin", "manager", "accountant"), async (req, res) => {
  try {
    const { name, companyName, phone, email, address, initialBalance = 0, notes } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ success: false, message: "Supplier name is required." });
    }

    const supplier = await Supplier.create({
      name: name.trim(),
      companyName: companyName ? companyName.trim() : "",
      phone: phone ? phone.trim() : "",
      email: email ? email.trim() : "",
      address: address ? address.trim() : "",
      balanceDue: parseFloat(initialBalance) || 0,
      notes: notes || ""
    });

    if (parseFloat(initialBalance) > 0) {
      await LedgerTransaction.create({
        transactionType: "Supplier Purchase",
        amount: parseFloat(initialBalance),
        supplierId: supplier._id,
        supplierName: supplier.name,
        previousBalance: 0,
        newBalance: parseFloat(initialBalance),
        notes: "Opening supplier balance payable",
        recordedBy: req.user?.username || "Admin"
      });
    }

    return res.status(201).json({ success: true, message: "Supplier added successfully!", supplier });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ledger/supplier-payment (Admin, Manager, Accountant)
router.post("/supplier-payment", isLoggedIn, allowRoles("admin", "manager", "accountant"), async (req, res) => {
  try {
    const { supplierId, amount, paymentMethod = "Cash", referenceNumber = "", notes = "" } = req.body;
    const paidAmount = parseFloat(amount);

    if (!supplierId || isNaN(paidAmount) || paidAmount <= 0) {
      return res.status(400).json({ success: false, message: "Valid supplier and payment amount are required." });
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found." });
    }

    const prevBal = supplier.balanceDue;
    supplier.balanceDue = Math.max(0, prevBal - paidAmount);
    await supplier.save();

    const transaction = await LedgerTransaction.create({
      transactionType: "Supplier Payment",
      amount: paidAmount,
      supplierId: supplier._id,
      supplierName: supplier.name,
      previousBalance: prevBal,
      newBalance: supplier.balanceDue,
      paymentMethod,
      referenceNumber: referenceNumber.trim(),
      notes: notes.trim() || `Payment made to supplier ${supplier.name}`,
      recordedBy: req.user?.username || "Admin"
    });

    return res.json({
      success: true,
      message: `Payment of PKR ${paidAmount.toLocaleString()} paid to ${supplier.name}. Remaining payable: PKR ${supplier.balanceDue.toLocaleString()}`,
      supplier,
      transaction
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

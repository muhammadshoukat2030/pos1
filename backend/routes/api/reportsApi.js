import express from "express";
import moment from "moment-timezone";
import Sale from "../../models/Sale.js";
import PrintSale from "../../models/PrintSale.js";
import Product from "../../models/Product.js";
import LedgerTransaction from "../../models/LedgerTransaction.js";
import { isLoggedIn } from "../../middleware/isLoggedIn.js";
import { allowRoles } from "../../middleware/allowRoles.js";

const router = express.Router();
const PKT_TIMEZONE = "Asia/Karachi";

// GET /api/reports/profit-loss
router.get("/profit-loss", isLoggedIn, allowRoles("admin", "manager", "accountant"), async (req, res) => {
  try {
    const { from, to, period = "month" } = req.query;
    const nowPKT = moment().tz(PKT_TIMEZONE);
    let start, end;

    if (period === "today") {
      start = nowPKT.clone().startOf("day").toDate();
      end = nowPKT.clone().endOf("day").toDate();
    } else if (period === "yesterday") {
      const y = nowPKT.clone().subtract(1, "days");
      start = y.startOf("day").toDate();
      end = y.endOf("day").toDate();
    } else if (period === "week") {
      start = nowPKT.clone().startOf("week").toDate();
      end = nowPKT.clone().endOf("day").toDate();
    } else if (period === "month") {
      start = nowPKT.clone().startOf("month").toDate();
      end = nowPKT.clone().endOf("day").toDate();
    } else if (period === "year") {
      start = nowPKT.clone().startOf("year").toDate();
      end = nowPKT.clone().endOf("day").toDate();
    } else if (period === "custom" && from && to) {
      start = moment.tz(from, PKT_TIMEZONE).startOf("day").toDate();
      end = moment.tz(to, PKT_TIMEZONE).endOf("day").toDate();
    } else {
      start = nowPKT.clone().startOf("month").toDate();
      end = nowPKT.clone().endOf("day").toDate();
    }

    const [sales, bills, expenses] = await Promise.all([
      Sale.find({ createdAt: { $gte: start, $lte: end } }).lean(),
      PrintSale.find({ createdAt: { $gte: start, $lte: end }, status: { $ne: "Held" } }).lean(),
      LedgerTransaction.find({
        date: { $gte: start, $lte: end },
        transactionType: "Cash Expense"
      }).lean()
    ]);

    let grossSales = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalCostOfGoods = 0;
    let totalRefundAmount = 0;
    let totalItemsSold = 0;

    sales.forEach((s) => {
      const netSold = (s.quantitySold || 0) - (s.refundQuantity || 0);
      const rate = s.rate || 0;
      const profit = s.profit || 0;
      const refundQty = s.refundQuantity || 0;

      if (netSold > 0) {
        totalItemsSold += netSold;
        grossSales += netSold * rate;
        totalCostOfGoods += netSold * rate - profit;
      }
      if (refundQty > 0) {
        totalRefundAmount += refundQty * rate;
      }
    });

    bills.forEach((b) => {
      totalDiscount += b.discountAmount || 0;
      totalTax += b.taxAmount || 0;
    });

    let totalOperatingExpenses = 0;
    const expenseBreakdown = {};
    expenses.forEach((e) => {
      const cat = e.expenseCategory || "Other";
      const amt = e.amount || 0;
      totalOperatingExpenses += amt;
      expenseBreakdown[cat] = (expenseBreakdown[cat] || 0) + amt;
    });

    const netSales = Math.max(0, grossSales - totalDiscount);
    const grossProfit = Math.max(0, netSales - totalCostOfGoods);
    const netProfit = grossProfit - totalOperatingExpenses;
    const grossMargin = netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(1) : "0.0";
    const netMargin = netSales > 0 ? ((netProfit / netSales) * 100).toFixed(1) : "0.0";

    return res.json({
      success: true,
      report: {
        period,
        startDate: moment(start).format("DD/MM/YYYY"),
        endDate: moment(end).format("DD/MM/YYYY"),
        metrics: {
          grossSales: Math.round(grossSales),
          totalDiscount: Math.round(totalDiscount),
          netSales: Math.round(netSales),
          totalTax: Math.round(totalTax),
          totalCostOfGoods: Math.round(totalCostOfGoods),
          totalRefundAmount: Math.round(totalRefundAmount),
          grossProfit: Math.round(grossProfit),
          totalOperatingExpenses: Math.round(totalOperatingExpenses),
          netProfit: Math.round(netProfit),
          grossMargin,
          netMargin,
          totalItemsSold,
          totalBills: bills.length
        },
        expenseBreakdown: Object.entries(expenseBreakdown).map(([category, amount]) => ({
          category,
          amount
        }))
      }
    });
  } catch (err) {
    console.error("Profit Loss Report Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/category (Category-wise Sales Breakdown)
router.get("/category", isLoggedIn, allowRoles("admin", "manager", "accountant"), async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = {};
    if (from && to) {
      query.createdAt = {
        $gte: moment.tz(from, PKT_TIMEZONE).startOf("day").toDate(),
        $lte: moment.tz(to, PKT_TIMEZONE).endOf("day").toDate()
      };
    }

    const sales = await Sale.find(query).lean();

    const categoryMap = {};
    let totalRevenue = 0;

    sales.forEach((s) => {
      const cat = s.category || "General";
      const netSold = (s.quantitySold || 0) - (s.refundQuantity || 0);
      const rev = netSold * (s.rate || 0);
      const profit = s.profit || 0;

      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          category: cat,
          quantitySold: 0,
          revenue: 0,
          profit: 0
        };
      }

      categoryMap[cat].quantitySold += netSold;
      categoryMap[cat].revenue += rev;
      categoryMap[cat].profit += profit;
      totalRevenue += rev;
    });

    const categories = Object.values(categoryMap).map((c) => ({
      ...c,
      revenue: Math.round(c.revenue),
      profit: Math.round(c.profit),
      sharePercentage: totalRevenue > 0 ? ((c.revenue / totalRevenue) * 100).toFixed(1) : "0.0"
    })).sort((a, b) => b.revenue - a.revenue);

    return res.json({
      success: true,
      totalRevenue: Math.round(totalRevenue),
      categories
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/daily (Daily Report)
router.get("/daily", isLoggedIn, allowRoles("admin", "manager", "accountant", "cashier"), async (req, res) => {
  try {
    const targetDate = req.query.date ? moment.tz(req.query.date, PKT_TIMEZONE) : moment().tz(PKT_TIMEZONE);
    const startOfDay = targetDate.clone().startOf("day").toDate();
    const endOfDay = targetDate.clone().endOf("day").toDate();

    const [bills, expenses] = await Promise.all([
      PrintSale.find({ createdAt: { $gte: startOfDay, $lte: endOfDay } })
        .populate("salesItems")
        .sort({ createdAt: -1 })
        .lean(),
      LedgerTransaction.find({ date: { $gte: startOfDay, $lte: endOfDay } }).lean()
    ]);

    let totalSales = 0;
    let totalCash = 0;
    let totalBank = 0;
    let totalCredit = 0;

    bills.forEach((b) => {
      const g = b.grandTotal || 0;
      totalSales += g;
      if (b.paymentMethod === "Card / Bank") totalBank += g;
      else if (b.paymentMethod === "AR Khata / Credit") totalCredit += g;
      else totalCash += g;
    });

    let totalExpenses = 0;
    let customerCashIn = 0;
    expenses.forEach((e) => {
      if (e.transactionType === "Cash Expense") totalExpenses += e.amount || 0;
      else if (e.transactionType === "Payment Received") customerCashIn += e.amount || 0;
    });

    const netCashInRegister = totalCash + customerCashIn - totalExpenses;

    return res.json({
      success: true,
      date: targetDate.format("DD/MM/YYYY"),
      metrics: {
        totalSales: Math.round(totalSales),
        totalOrders: bills.length,
        cashSales: Math.round(totalCash),
        bankSales: Math.round(totalBank),
        creditSales: Math.round(totalCredit),
        customerCashIn: Math.round(customerCashIn),
        totalExpenses: Math.round(totalExpenses),
        netCashInRegister: Math.round(netCashInRegister)
      },
      orders: bills
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

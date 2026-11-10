import express from "express";
import moment from "moment-timezone";
import Product from "../../models/Product.js";
import Agent from "../../models/Agent.js";
import Sale from "../../models/Sale.js";
import PrintSale from "../../models/PrintSale.js";
import Customer from "../../models/Customer.js";
import Supplier from "../../models/Supplier.js";
import ProductBatch from "../../models/ProductBatch.js";
import { isLoggedIn } from "../../middleware/isLoggedIn.js";

const router = express.Router();
const PKT_TIMEZONE = "Asia/Karachi";

// GET /api/dashboard/stats
router.get("/stats", isLoggedIn, async (req, res) => {
  try {
    const nowPKT = moment().tz(PKT_TIMEZONE);
    const startOfToday = nowPKT.clone().startOf("day").toDate();
    const endOfToday = nowPKT.clone().endOf("day").toDate();
    const startOfYear = nowPKT.clone().startOf("year").toDate();
    const thirtyDaysFromNow = nowPKT.clone().add(30, "days").toDate();

    // 1. High Performance Parallel MongoDB Aggregations
    const [
      productAggResult,
      salesAggResult,
      monthlyAggResult,
      topSellingAggResult,
      khataAggResult,
      supplierAggResult,
      lowStockProducts,
      lowStockCount,
      expiringProducts,
      expiryCount,
      agents,
      todayBills
    ] = await Promise.all([
      // Inventory summary aggregation
      Product.aggregate([
        {
          $group: {
            _id: null,
            totalStock: { $sum: { $ifNull: ["$totalProduct", 0] } },
            totalRemainingStock: { $sum: { $ifNull: ["$remaining", 0] } },
            remainingStockValue: {
              $sum: {
                $multiply: [
                  { $ifNull: ["$remaining", 0] },
                  { $ifNull: ["$salePrice", { $ifNull: ["$rate", 0] }] }
                ]
              }
            },
            totalProductsCount: { $sum: 1 }
          }
        }
      ]),

      // Lifetime sales aggregation
      Sale.aggregate([
        {
          $project: {
            netSold: { $subtract: [{ $ifNull: ["$quantitySold", 0] }, { $ifNull: ["$refundQuantity", 0] }] },
            rate: { $ifNull: ["$rate", 0] },
            profit: { $ifNull: ["$profit", 0] }
          }
        },
        { $match: { netSold: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            totalItemsSold: { $sum: "$netSold" },
            totalRevenue: { $sum: { $multiply: ["$netSold", "$rate"] } },
            totalNetProfit: { $sum: "$profit" }
          }
        }
      ]),

      // Monthly revenue and profit aggregation (Year-to-date)
      Sale.aggregate([
        { $match: { createdAt: { $gte: startOfYear } } },
        {
          $project: {
            month: { $month: { date: "$createdAt", timezone: PKT_TIMEZONE } },
            netSold: { $subtract: [{ $ifNull: ["$quantitySold", 0] }, { $ifNull: ["$refundQuantity", 0] }] },
            rate: { $ifNull: ["$rate", 0] },
            profit: { $ifNull: ["$profit", 0] }
          }
        },
        { $match: { netSold: { $gt: 0 } } },
        {
          $group: {
            _id: "$month",
            monthlyRevenue: { $sum: { $multiply: ["$netSold", "$rate"] } },
            monthlyProfit: { $sum: "$profit" }
          }
        }
      ]),

      // Top selling products aggregation
      Sale.aggregate([
        {
          $project: {
            itemName: "$itemName",
            brand: { $ifNull: ["$brandName", "General"] },
            netSold: { $subtract: [{ $ifNull: ["$quantitySold", 0] }, { $ifNull: ["$refundQuantity", 0] }] },
            rate: { $ifNull: ["$rate", 0] }
          }
        },
        { $match: { netSold: { $gt: 0 } } },
        {
          $group: {
            _id: "$itemName",
            name: { $first: "$itemName" },
            brand: { $first: "$brand" },
            count: { $sum: "$netSold" },
            revenue: { $sum: { $multiply: ["$netSold", "$rate"] } }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 6 }
      ]),

      // Customer Khata balances aggregation
      Customer.aggregate([
        { $match: { currentBalance: { $gt: 0 } } },
        { $group: { _id: null, totalKhata: { $sum: "$currentBalance" } } }
      ]),

      // Supplier payables aggregation
      Supplier.aggregate([
        { $match: { balanceDue: { $gt: 0 } } },
        { $group: { _id: null, totalPayable: { $sum: "$balanceDue" } } }
      ]),

      // Low stock products preview (indexed limit)
      Product.find({
        $expr: { $lte: ["$remaining", { $ifNull: ["$minStockAlert", 5] }] }
      })
        .sort({ remaining: 1 })
        .limit(8)
        .lean(),

      // Total low stock count
      Product.countDocuments({
        $expr: { $lte: ["$remaining", { $ifNull: ["$minStockAlert", 5] }] }
      }),

      // Expiring products preview (indexed limit)
      Product.find({
        expiryDate: { $exists: true, $ne: null, $lte: thirtyDaysFromNow }
      })
        .sort({ expiryDate: 1 })
        .limit(8)
        .lean(),

      // Total expiring count
      Product.countDocuments({
        expiryDate: { $exists: true, $ne: null, $lte: thirtyDaysFromNow }
      }),

      // Agents for commission
      Agent.find({}).populate("items").lean(),

      // Today's orders for cashflow breakdown
      PrintSale.find({ createdAt: { $gte: startOfToday, $lte: endOfToday } })
        .populate("salesItems")
        .lean()
    ]);

    // 2. Inventory totals
    const pAgg = productAggResult[0] || {};
    const totalStock = pAgg.totalStock || 0;
    const totalRemainingStock = pAgg.totalRemainingStock || 0;
    const remainingStockValue = pAgg.remainingStockValue || 0;
    const totalProductsCount = pAgg.totalProductsCount || 0;

    const lowStockAlerts = lowStockProducts.map((p) => ({
      id: p._id,
      itemName: p.itemName,
      brand: p.brandName || p.brand || "General",
      category: p.category || "General",
      remaining: p.remaining || 0,
      minAlert: p.minStockAlert || 5,
      rate: Number(p.salePrice || p.rate || 0),
      barcode: p.barcode || p.stockID,
      stockID: p.stockID
    }));

    // Batched Lot Expirations
    const expiringBatches = await ProductBatch.find({
      status: "Active",
      quantityRemaining: { $gt: 0 },
      expiryDate: { $lte: thirtyDaysFromNow }
    })
      .populate("productId", "itemName brandName brand salePrice rate")
      .sort({ expiryDate: 1 })
      .limit(10)
      .lean();

    const batchExpiryAlerts = expiringBatches.map((b) => {
      const daysToExpiry = moment(b.expiryDate).diff(nowPKT, "days");
      return {
        id: b._id,
        itemName: `${b.productId?.itemName || "Item"} [Lot: ${b.batchNumber}]`,
        brand: b.productId?.brandName || "General",
        expiryDate: moment(b.expiryDate).format("DD/MM/YYYY"),
        daysLeft: daysToExpiry,
        remaining: b.quantityRemaining || 0,
        rate: Number(b.salePrice || b.productId?.salePrice || 0),
        isBatch: true,
        batchNumber: b.batchNumber
      };
    });

    const expiryAlerts = [
      ...batchExpiryAlerts,
      ...expiringProducts.map((p) => {
        const daysToExpiry = moment(p.expiryDate).diff(nowPKT, "days");
        return {
          id: p._id,
          itemName: p.itemName,
          brand: p.brandName || p.brand || "General",
          expiryDate: moment(p.expiryDate).format("DD/MM/YYYY"),
          daysLeft: daysToExpiry,
          remaining: p.remaining || 0,
          rate: Number(p.salePrice || p.rate || 0)
        };
      })
    ].slice(0, 10);

    // 3. Lifetime Sales & Profit
    const sAgg = salesAggResult[0] || {};
    const totalRevenue = sAgg.totalRevenue || 0;
    const totalNetProfit = sAgg.totalNetProfit || 0;
    const totalCostOfGoodsSold = Math.max(0, totalRevenue - totalNetProfit);

    // 4. Today's Cash Flow & Sales Breakdown
    let todayRevenue = 0;
    let todayOrdersCount = todayBills.length;
    let cashInHand = 0;
    let cashInBank = 0;
    let creditDue = 0;

    todayBills.forEach((b) => {
      let bTotal = 0;
      if (b.salesItems && b.salesItems.length > 0) {
        b.salesItems.forEach((item) => {
          const actualQty = (item.quantitySold || 0) - (item.refundQuantity || 0);
          bTotal += actualQty * (item.rate || 0);
        });
      } else if (b.grandTotal) {
        bTotal = b.grandTotal;
      }
      todayRevenue += bTotal;

      if (b.paymentMethod === "Card / Bank") {
        cashInBank += bTotal;
      } else if (b.paymentMethod === "AR Khata / Credit") {
        creditDue += bTotal;
      } else {
        cashInHand += bTotal;
      }
    });

    // Customer Khata balances from aggregation
    const totalCustomerKhataBalance = khataAggResult[0]?.totalKhata || 0;
    creditDue = Math.max(creditDue, totalCustomerKhataBalance);

    // Commission total for agents
    let totalCommission = 0;
    let commissionPaid = 0;
    agents.forEach((a) => {
      (a.items || []).forEach((it) => {
        totalCommission += Number(it.percentageAmount || 0);
        commissionPaid += Number(it.paidAmount || 0);
      });
    });
    const commissionPayable = totalCommission - commissionPaid;

    // Supplier Payables
    const totalSupplierPayable = supplierAggResult[0]?.totalPayable || 0;

    // 5. Monthly Revenue & Profit Trend (Jan - Dec)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyRevenue = Array(12).fill(0);
    const monthlyProfit = Array(12).fill(0);

    monthlyAggResult.forEach((m) => {
      const idx = m._id - 1;
      if (idx >= 0 && idx < 12) {
        monthlyRevenue[idx] = Math.round(m.monthlyRevenue || 0);
        monthlyProfit[idx] = Math.round(m.monthlyProfit || 0);
      }
    });

    const maxMonthlyRev = Math.max(...monthlyRevenue, 1);

    // 6. Top Selling Products
    const topSellingProducts = topSellingAggResult.map((it) => ({
      name: it.name,
      brand: it.brand,
      count: it.count,
      revenue: Math.round(it.revenue)
    }));

    // Automated Business Insight
    const profitMargin = totalRevenue > 0 ? ((totalNetProfit / totalRevenue) * 100).toFixed(1) : "0.0";
    const healthPercent = totalStock > 0 ? ((totalRemainingStock / totalStock) * 100).toFixed(1) : "100.0";
    const insightText = `Operations running strong. Net profit margin is ${profitMargin}% with ${healthPercent}% healthy inventory across ${totalProductsCount} product lines.`;

    return res.json({
      success: true,
      stats: {
        totalRevenue: Math.round(totalRevenue),
        totalCost: Math.round(totalCostOfGoodsSold),
        netProfit: Math.round(totalNetProfit),
        profitMargin,
        todayRevenue: Math.round(todayRevenue),
        todayOrdersCount,
        cashInHand: Math.round(cashInHand),
        cashInBank: Math.round(cashInBank),
        creditDue: Math.round(creditDue),
        totalSupplierPayable: Math.round(totalSupplierPayable),
        totalStock,
        totalRemainingStock,
        remainingStockValue: Math.round(remainingStockValue),
        activeAgents: agents.length,
        totalCommission: Math.round(totalCommission),
        commissionPayable: Math.round(commissionPayable),
        lowStockCount,
        expiryCount
      },
      insightText,
      monthlyRevenue,
      monthlyProfit,
      months,
      maxMonthlyRev,
      lowStockAlerts,
      expiryAlerts,
      topSellingProducts
    });
  } catch (err) {
    console.error("Dashboard Stats API Error:", err);
    return res.status(500).json({ success: false, message: "Error calculating dashboard stats: " + err.message });
  }
});

export default router;

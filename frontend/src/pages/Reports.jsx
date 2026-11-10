import React, { useState, useEffect } from "react";
import {
  FileBarChart,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Printer,
  Download,
  Layers,
  PieChart,
  Receipt,
  Sparkles,
  ShoppingBag,
  ArrowUpRight
} from "lucide-react";
import api from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { StatCard } from "../components/common";

export default function Reports() {
  const { storeSettings } = useTheme();
  const { showToast } = useToast();
  const currency = storeSettings?.currency || "PKR";

  const [activeTab, setActiveTab] = useState("profit-loss"); // 'profit-loss' | 'category' | 'daily'
  const [period, setPeriod] = useState("month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);

  // Report Data
  const [plData, setPlData] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [dailyData, setDailyData] = useState(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      if (activeTab === "profit-loss") {
        const res = await api.get("/reports/profit-loss", {
          params: { period, from: fromDate, to: toDate }
        });
        if (res.data.success) setPlData(res.data.report);
      } else if (activeTab === "category") {
        const res = await api.get("/reports/category", {
          params: { from: fromDate, to: toDate }
        });
        if (res.data.success) setCategoryData(res.data);
      } else if (activeTab === "daily") {
        const res = await api.get("/reports/daily");
        if (res.data.success) setDailyData(res.data);
      }
    } catch (err) {
      showToast("Error loading report: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab, period]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-theme-textPrimary flex items-center gap-2.5">
            <FileBarChart className="w-6 h-6 text-theme-primary" /> Executive Reports & Analytics
          </h1>
          <p className="text-xs text-theme-textSecondary mt-0.5">
            Profit & Loss statements, daily register reconciliation, and category-wise sales breakdown.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn border border-theme-border bg-theme-surface hover:bg-theme-card text-theme-textPrimary font-medium text-xs shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-theme-primary" /> Print Report
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex items-center gap-1.5 border-b border-theme-border pb-1 overflow-x-auto no-scrollbar">
        {[
          { id: "profit-loss", label: "Profit & Loss Statement", icon: DollarSign },
          { id: "category", label: "Category-wise Sales Breakdown", icon: PieChart },
          { id: "daily", label: "Daily Register Summary", icon: Receipt }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-btn text-xs font-medium transition-all duration-theme cursor-pointer ${
              activeTab === t.id
                ? "bg-[#14532D] text-white font-semibold shadow-xs"
                : "text-theme-textSecondary hover:bg-theme-surface hover:text-theme-textPrimary border border-transparent"
            }`}
          >
            <t.icon className={`w-3.5 h-3.5 ${activeTab === t.id ? "text-white" : "text-theme-textSecondary"}`} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Date Filter Bar */}
      {activeTab === "profit-loss" && (
        <div className="bg-theme-card border border-theme-border rounded-card p-4 shadow-card flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "week", label: "This Week" },
              { id: "month", label: "This Month" },
              { id: "year", label: "This Year" }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1 rounded-btn text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  period === p.id
                    ? "bg-[#14532D] text-white font-semibold shadow-xs"
                    : "bg-theme-surface text-theme-textSecondary hover:text-theme-textPrimary"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-theme-textMuted font-medium">Custom Range:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2 py-1 bg-black/5 dark:bg-white/5 border border-theme-border rounded-md text-xs"
            />
            <span className="text-theme-textMuted">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2 py-1 bg-black/5 dark:bg-white/5 border border-theme-border rounded-md text-xs"
            />
            <button
              onClick={() => {
                setPeriod("custom");
                fetchReports();
              }}
              className="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs shadow-2xs cursor-pointer transition"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: PROFIT & LOSS STATEMENT */}
      {activeTab === "profit-loss" && plData && (
        <div className="space-y-6">
          {/* Key Metrics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
            <StatCard
              title="Gross Sales"
              value={`${currency} ${plData.metrics.grossSales.toLocaleString()}`}
              icon={DollarSign}
              badgeText={`${plData.metrics.totalBills} Bills`}
              badgeType="neutral"
              iconBg="bg-emerald-500/10 dark:bg-emerald-950/40"
              iconColor="text-emerald-700 dark:text-emerald-400"
            />

            <StatCard
              title="Cost of Goods (COGS)"
              value={`${currency} ${plData.metrics.totalCostOfGoods.toLocaleString()}`}
              icon={TrendingDown}
              badgeText="Purchase Costs"
              badgeType="danger"
              iconBg="bg-rose-500/10 dark:bg-rose-950/40"
              iconColor="text-rose-600 dark:text-rose-400"
            />

            <StatCard
              title="Gross Profit"
              value={`${currency} ${plData.metrics.grossProfit.toLocaleString()}`}
              icon={TrendingUp}
              badgeText={`Margin: ${plData.metrics.grossMargin}%`}
              badgeType="success"
              iconBg="bg-emerald-500/10 dark:bg-emerald-950/40"
              iconColor="text-emerald-600 dark:text-emerald-400"
            />

            <StatCard
              title="Net Operating Profit"
              value={`${currency} ${plData.metrics.netProfit.toLocaleString()}`}
              icon={Sparkles}
              badgeText={`Net: ${plData.metrics.netMargin}%`}
              badgeType="success"
              iconBg="bg-emerald-500/10 dark:bg-emerald-950/40"
              iconColor="text-emerald-600 dark:text-emerald-400"
            />
          </div>

          {/* Statement Table */}
          <div className="bg-theme-card border border-theme-border rounded-lg p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <div>
                <h3 className="font-extrabold text-base text-theme-textPrimary">Statement of Profit & Loss</h3>
                <p className="text-xs text-theme-textMuted">Period: {plData.startDate} — {plData.endDate}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-theme-border">
                <span className="font-semibold text-theme-textPrimary">Gross Sales Revenue</span>
                <span className="font-bold text-theme-textPrimary">{currency} {plData.metrics.grossSales.toLocaleString()}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-theme-border text-rose-500">
                <span>Less: Total Discounts Given</span>
                <span>- {currency} {plData.metrics.totalDiscount.toLocaleString()}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-theme-border font-bold text-sm bg-black/5 dark:bg-white/5 px-2 rounded-lg">
                <span>Net Sales Revenue</span>
                <span>{currency} {plData.metrics.netSales.toLocaleString()}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-theme-border text-rose-500">
                <span>Less: Cost of Goods Sold (Purchase Cost)</span>
                <span>- {currency} {plData.metrics.totalCostOfGoods.toLocaleString()}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-theme-border font-black text-sm bg-emerald-500/10 text-emerald-600 px-2 rounded-lg">
                <span>GROSS PROFIT</span>
                <span>{currency} {plData.metrics.grossProfit.toLocaleString()} ({plData.metrics.grossMargin}%)</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-theme-border text-theme-textSecondary">
                <span>Total Taxes / GST Collected</span>
                <span>+{currency} {plData.metrics.totalTax.toLocaleString()}</span>
              </div>

              {/* Operating Expenses */}
              <div className="pt-2">
                <div className="font-bold text-theme-textPrimary mb-1.5">Operating Expenses (Cash-Outs):</div>
                {plData.expenseBreakdown.length === 0 ? (
                  <p className="text-theme-textMuted italic pl-4">No operating expenses recorded in this period.</p>
                ) : (
                  plData.expenseBreakdown.map((exp, idx) => (
                    <div key={idx} className="flex justify-between py-1 pl-4 text-theme-textSecondary">
                      <span>• {exp.category}</span>
                      <span>{currency} {exp.amount.toLocaleString()}</span>
                    </div>
                  ))
                )}
                <div className="flex justify-between py-1.5 border-t border-theme-border font-bold text-rose-600 mt-1">
                  <span>Total Operating Expenses</span>
                  <span>- {currency} {plData.metrics.totalOperatingExpenses.toLocaleString()}</span>
                </div>
              </div>

              {/* Net Profit Banner */}
              <div className="flex justify-between py-3 px-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-black text-base shadow-md mt-4">
                <span>NET PROFIT FOR THE PERIOD</span>
                <span>{currency} {plData.metrics.netProfit.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORY BREAKDOWN */}
      {activeTab === "category" && categoryData && (
        <div className="bg-theme-card border border-theme-border rounded-lg shadow-card overflow-hidden">
          <div className="p-4 border-b border-theme-border flex items-center justify-between">
            <h3 className="font-bold text-sm text-theme-textPrimary">Category Sales & Profitability Analysis</h3>
            <span className="text-xs font-bold text-theme-primary">
              Total Revenue: {currency} {categoryData.totalRevenue.toLocaleString()}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/5 dark:bg-white/5 text-[11px] font-bold text-theme-textMuted uppercase border-b border-theme-border">
                <tr>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-center">Units Sold</th>
                  <th className="p-3 text-right">Revenue ({currency})</th>
                  <th className="p-3 text-right">Profit ({currency})</th>
                  <th className="p-3 text-right">Revenue Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {(categoryData.categories || []).map((cat, idx) => (
                  <tr key={idx} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                    <td className="p-3 font-bold text-theme-textPrimary flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-theme-primary" />
                      <span>{cat.category}</span>
                    </td>
                    <td className="p-3 text-center font-semibold">{cat.quantitySold} units</td>
                    <td className="p-3 text-right font-black text-theme-textPrimary">
                      {currency} {cat.revenue.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-600">
                      {currency} {cat.profit.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-bold text-theme-primary">
                      {cat.sharePercentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DAILY REGISTER RECONCILIATION */}
      {activeTab === "daily" && dailyData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
            <StatCard
              title="Daily Total Sales"
              value={`${currency} ${dailyData.metrics.totalSales.toLocaleString()}`}
              icon={Receipt}
              badgeText={`${dailyData.metrics.totalOrders} Orders`}
              badgeType="neutral"
              iconBg="bg-emerald-500/10 dark:bg-emerald-950/40"
              iconColor="text-emerald-600 dark:text-emerald-400"
            />

            <StatCard
              title="Cash in Register"
              value={`${currency} ${dailyData.metrics.netCashInRegister.toLocaleString()}`}
              icon={DollarSign}
              badgeText="Net Cash Flow"
              badgeType="success"
              iconBg="bg-emerald-500/10 dark:bg-emerald-950/40"
              iconColor="text-emerald-600 dark:text-emerald-400"
            />

            <StatCard
              title="Bank & Card Sales"
              value={`${currency} ${dailyData.metrics.bankSales.toLocaleString()}`}
              icon={TrendingUp}
              badgeText="Digital"
              badgeType="info"
              iconBg="bg-emerald-500/10 dark:bg-emerald-950/40"
              iconColor="text-emerald-700 dark:text-emerald-400"
            />

            <StatCard
              title="Credit (Khata) Sales"
              value={`${currency} ${dailyData.metrics.creditSales.toLocaleString()}`}
              icon={Layers}
              badgeText="Receivables"
              badgeType="warning"
              iconBg="bg-amber-500/10 dark:bg-amber-950/40"
              iconColor="text-amber-600 dark:text-amber-400"
            />
          </div>
        </div>
      )}
    </div>
  );
}

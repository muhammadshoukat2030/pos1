import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Wallet,
  Building,
  CreditCard,
  PlusCircle,
  Calculator,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import api from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { CardSkeleton } from "../components/LoadingSkeleton";
import { StatCard } from "../components/common";

export default function Dashboard() {
  const { storeSettings } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get("/dashboard/stats");
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Dashboard Stats Fetch Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardStats();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-44 bg-theme-primary/20 rounded-xl animate-pulse" />
        <CardSkeleton count={4} />
      </div>
    );
  }

  const stats = data?.stats || {};
  const currency = storeSettings?.currency || "PKR";
  const monthlyRevenue = data?.monthlyRevenue || [];
  const monthlyProfit = data?.monthlyProfit || [];
  const months = data?.months || ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const maxMonthlyRev = data?.maxMonthlyRev || 1;
  const lowStockAlerts = data?.lowStockAlerts || [];
  const expiryAlerts = data?.expiryAlerts || [];
  const topSellingProducts = data?.topSellingProducts || [];

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {/* 1. COMPACT EXECUTIVE HEADER BANNER */}
      <div
        style={{ background: "var(--header-gradient)" }}
        className="relative overflow-hidden rounded-card p-4 sm:p-5 text-white shadow-card"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/15 backdrop-blur-md text-[10.5px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
              <span>Live Store Operations</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">
              {storeSettings?.storeName || "Bizniz POS"} Dashboard
            </h1>
            <p className="text-[11.5px] text-white/80 max-w-xl">
              Executive business metrics, inventory health overview, and real-time revenue analytics.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/pos"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-white text-[#14532D] font-semibold text-xs shadow-xs hover:bg-white/95 transition transform active:scale-95 cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5 text-[#14532D]" />
              <span>New POS Sale</span>
            </Link>
            <Link
              to="/products?tab=stock"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn bg-white/15 hover:bg-white/25 text-white font-medium text-xs backdrop-blur-md transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Stock</span>
            </Link>
            <button
              onClick={handleRefresh}
              className="p-1.5 rounded-btn bg-white/15 hover:bg-white/25 text-white backdrop-blur-md transition cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Automated Business Insight Banner */}
        {data?.insightText && (
          <div className="relative z-10 mt-2.5 pt-2.5 border-t border-white/15 flex items-center gap-2 text-xs text-white/90">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
            <span className="font-medium text-[11px]">{data.insightText}</span>
          </div>
        )}
      </div>

      {/* 2. COMPACT 4-COLUMN PKR KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
        <StatCard
          title={`Total Revenue (${currency})`}
          value={`${currency} ${Number(stats.totalRevenue || 0).toLocaleString()}`}
          icon={TrendingUp}
          badgeText={`+${stats.profitMargin || "0.0"}% Margin`}
          badgeType="success"
        />

        <StatCard
          title={`Cost of Goods (${currency})`}
          value={`${currency} ${Number(stats.totalCost || 0).toLocaleString()}`}
          icon={TrendingDown}
          badgeText="Purchases / COGS"
          badgeType="danger"
        />

        <StatCard
          title={`Net Profit (${currency})`}
          value={`${currency} ${Number(stats.netProfit || 0).toLocaleString()}`}
          icon={DollarSign}
          badgeText="Profitable"
          badgeType="success"
        />

        <StatCard
          title={`Today's Revenue (${currency})`}
          value={`${currency} ${Number(stats.todayRevenue || 0).toLocaleString()}`}
          icon={ShoppingCart}
          badgeText={`${stats.todayOrdersCount || 0} Bills Today`}
          badgeType="info"
        />
      </div>

      {/* 3. LIQUIDITY & WORKING CAPITAL STRIP */}
      <div className="bg-theme-card border border-theme-border rounded-card p-4 shadow-card">
        <div className="text-[10.5px] font-semibold uppercase tracking-wider text-theme-textSecondary mb-2.5 flex items-center gap-2">
          <Wallet className="w-3.5 h-3.5 text-theme-primary" />
          <span>Liquidity & Working Capital Strip</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 divide-y sm:divide-y-0 sm:divide-x divide-theme-border">
          {/* Cash in Hand */}
          <div className="flex items-center gap-2.5 sm:px-3 py-1 sm:py-0">
            <div className="w-8 h-8 rounded-btn bg-theme-iconBg text-theme-iconColor flex items-center justify-center flex-shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10.5px] font-medium text-theme-textSecondary">Cash in Register</p>
              <h4 className="text-sm sm:text-base font-bold text-theme-textPrimary">
                {currency} {Number(stats.cashInHand || 0).toLocaleString()}
              </h4>
            </div>
          </div>

          {/* Cash in Bank / Online */}
          <div className="flex items-center gap-2.5 sm:px-3 py-1 sm:py-0">
            <div className="w-8 h-8 rounded-btn bg-theme-iconBg text-theme-iconColor flex items-center justify-center flex-shrink-0">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10.5px] font-medium text-theme-textSecondary">Bank & Online / Card</p>
              <h4 className="text-sm sm:text-base font-bold text-theme-textPrimary">
                {currency} {Number(stats.cashInBank || 0).toLocaleString()}
              </h4>
            </div>
          </div>

          {/* Total Payables / Khata Due */}
          <div className="flex items-center gap-2.5 sm:px-3 py-1 sm:py-0">
            <div className="w-8 h-8 rounded-btn bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10.5px] font-medium text-theme-textSecondary">Total AR Khata / Credit Due</p>
              <h4 className="text-sm sm:text-base font-bold text-theme-textPrimary">
                {currency} {Number(stats.creditDue || 0).toLocaleString()}
              </h4>
            </div>
          </div>
        </div>
      </div>

      {/* 4. REVENUE TREND & ANALYTICS CHARTS (Left 65% / Right 35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        {/* Left Column (65%): Monthly Revenue Trend */}
        <div className="lg:col-span-8 bg-theme-card border border-theme-border rounded-card p-4 sm:p-5 shadow-card space-y-3 flex flex-col justify-between min-h-[290px]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-theme-textPrimary">Annual Revenue Trend ({new Date().getFullYear()})</h3>
              <p className="text-[11px] text-theme-textSecondary">Monthly revenue vs net profit breakdown in {currency}</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-xs text-theme-textSecondary">
                <span className="w-2.5 h-2.5 rounded bg-emerald-700" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-xs text-theme-textSecondary">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Profit
              </span>
            </div>
          </div>

          {/* Visual Vertical Bar Chart */}
          <div className="pt-2 pb-1">
            <div className="grid grid-cols-12 gap-1.5 sm:gap-2.5 items-end h-44 border-b border-theme-border pb-2">
              {months.map((m, idx) => {
                const rev = monthlyRevenue[idx] || 0;
                const prof = monthlyProfit[idx] || 0;
                const revHeight = maxMonthlyRev > 0 ? Math.max(8, Math.round((rev / maxMonthlyRev) * 100)) : 8;
                const profHeight = maxMonthlyRev > 0 ? Math.max(4, Math.round((prof / maxMonthlyRev) * 100)) : 4;

                return (
                  <div key={idx} className="flex flex-col items-center justify-end h-full group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-30 bg-slate-900 text-white text-[10px] p-2 rounded-btn shadow-xl whitespace-nowrap pointer-events-none">
                      <div className="font-bold">{m}</div>
                      <div>Rev: {currency} {rev.toLocaleString()}</div>
                      <div>Profit: {currency} {prof.toLocaleString()}</div>
                    </div>

                    <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1">
                      {/* Revenue Bar */}
                      <div
                        className="w-1/2 bg-[#14532D] group-hover:bg-[#104323] rounded-t transition-all duration-theme"
                        style={{ height: `${revHeight}%` }}
                      />
                      {/* Profit Bar */}
                      <div
                        className="w-1/2 bg-emerald-500 group-hover:bg-emerald-600 rounded-t transition-all duration-theme"
                        style={{ height: `${profHeight}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-theme-textSecondary mt-1.5">{m}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom stats summary */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
            <div className="p-2 rounded-btn bg-theme-surface">
              <span className="text-[11px] text-theme-textSecondary">Active Products</span>
              <p className="font-bold text-xs sm:text-sm text-theme-textPrimary mt-0.5">{stats.totalStock || 0} Units</p>
            </div>
            <div className="p-2 rounded-btn bg-theme-surface">
              <span className="text-[11px] text-theme-textSecondary">Stock Valuation</span>
              <p className="font-bold text-xs sm:text-sm text-theme-textPrimary mt-0.5">{currency} {Number(stats.remainingStockValue || 0).toLocaleString()}</p>
            </div>
            <div className="p-2 rounded-btn bg-theme-surface">
              <span className="text-[11px] text-theme-textSecondary">Active Agents</span>
              <p className="font-bold text-xs sm:text-sm text-theme-textPrimary mt-0.5">{stats.activeAgents || 0} Staff</p>
            </div>
          </div>
        </div>

        {/* Right Column (35%): Alerts & Top Selling */}
        <div className="lg:col-span-4 flex flex-col gap-3 min-h-[290px] justify-between">
          {/* Critical Stock Alerts */}
          <div className="bg-theme-card border border-theme-border rounded-card p-3.5 shadow-card flex-1 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between border-b border-theme-border pb-2">
              <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-theme-textPrimary">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Critical Stock Alerts ({lowStockAlerts.length})</span>
              </div>
              <Link to="/products?tab=stock" className="text-xs font-semibold text-theme-primary hover:underline">
                Restock
              </Link>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {lowStockAlerts.length === 0 ? (
                <div className="py-4 text-center text-xs text-theme-textSecondary">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                  All products healthy! No low stock alerts.
                </div>
              ) : (
                lowStockAlerts.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-btn bg-amber-500/10 border border-amber-500/20 text-xs"
                  >
                    <div>
                      <p className="font-bold text-theme-textPrimary truncate max-w-[130px]">{it.itemName}</p>
                      <p className="text-[10.5px] text-theme-textSecondary">{it.brand} • Min: {it.minAlert}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-1.5 py-0.5 rounded-badge bg-rose-500 text-white font-bold text-[10px]">
                        {it.remaining} left
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="bg-theme-card border border-theme-border rounded-card p-3.5 shadow-card flex-1 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between border-b border-theme-border pb-2">
              <h3 className="font-bold text-xs sm:text-sm text-theme-textPrimary">Top Selling Products</h3>
              <Link to="/reports" className="text-xs font-semibold text-theme-primary hover:underline">
                View Reports
              </Link>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {topSellingProducts.length === 0 ? (
                <div className="py-4 text-center text-xs text-theme-textSecondary">
                  No sales recorded yet.
                </div>
              ) : (
                topSellingProducts.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-btn bg-theme-surface border border-theme-border text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-btn bg-[#14532D] text-white flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-theme-textPrimary truncate max-w-[130px]">{p.itemName}</p>
                        <p className="text-[10px] text-theme-textSecondary">{p.totalQty} sold</p>
                      </div>
                    </div>
                    <div className="text-right font-mono font-bold text-theme-textPrimary text-xs">
                      {currency} {Number(p.revenue || 0).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
        <div className="h-44 bg-theme-primary/20 rounded-3xl animate-pulse" />
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
    <div className="space-y-6 pb-12">
      {/* 1. THEMED GRADIENT WAVE HEADER BANNER (4-Theme Adaptive) */}
      <div
        style={{ background: "var(--header-gradient)" }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-card"
      >
        {/* Decorative Wave SVG */}
        <svg
          className="absolute -right-10 -bottom-10 w-96 h-56 opacity-15 pointer-events-none"
          viewBox="0 0 500 250"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0 120 C150 180 350 40 500 100 L500 250 L0 250 Z" fill="#FFFFFF" />
        </svg>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
              <span>Live Store Operations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {storeSettings?.storeName || "Universal Super Mart"} Dashboard
            </h1>
            <p className="text-sm text-white/80 max-w-xl">
              Executive business metrics, rapid inventory health overview, and real-time revenue analytics.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/pos"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-theme-textPrimary font-bold text-sm shadow-md hover:bg-white/90 transition transform active:scale-95"
            >
              <Calculator className="w-4 h-4 text-theme-primary" />
              <span>New POS Sale</span>
            </Link>
            <Link
              to="/products?tab=stock"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-sm backdrop-blur-md transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Stock</span>
            </Link>
            <button
              onClick={handleRefresh}
              className="p-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-md transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Automated Business Insight Banner */}
        {data?.insightText && (
          <div className="relative z-10 mt-6 pt-4 border-t border-white/15 flex items-center gap-3 text-xs sm:text-sm text-white/90">
            <Sparkles className="w-5 h-5 text-amber-300 flex-shrink-0" />
            <span className="font-medium">{data.insightText}</span>
          </div>
        )}
      </div>

      {/* 2. 4-COLUMN PKR KPI CARDS (Using Unified StatCard Component) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={`Total Revenue (${currency})`}
          value={`${currency} ${Number(stats.totalRevenue || 0).toLocaleString()}`}
          icon={TrendingUp}
          badgeText={`+${stats.profitMargin || "0.0"}% Margin`}
          badgeType="success"
          iconBg="bg-teal-500/10 dark:bg-teal-950/40"
          iconColor="text-teal-600 dark:text-teal-400"
        />

        <StatCard
          title={`Cost of Goods (${currency})`}
          value={`${currency} ${Number(stats.totalCost || 0).toLocaleString()}`}
          icon={TrendingDown}
          badgeText="Purchases / COGS"
          badgeType="danger"
          iconBg="bg-rose-500/10 dark:bg-rose-950/40"
          iconColor="text-rose-600 dark:text-rose-400"
        />

        <StatCard
          title={`Net Profit (${currency})`}
          value={`${currency} ${Number(stats.netProfit || 0).toLocaleString()}`}
          icon={DollarSign}
          badgeText="Profitable"
          badgeType="success"
          iconBg="bg-emerald-500/10 dark:bg-emerald-950/40"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />

        <StatCard
          title={`Today's Revenue (${currency})`}
          value={`${currency} ${Number(stats.todayRevenue || 0).toLocaleString()}`}
          icon={ShoppingCart}
          badgeText={`${stats.todayOrdersCount || 0} Bills Today`}
          badgeType="info"
          iconBg="bg-blue-500/10 dark:bg-blue-950/40"
          iconColor="text-blue-600 dark:text-blue-400"
        />
      </div>

      {/* 3. LIQUIDITY & WORKING CAPITAL STRIP (Image 2) */}
      <div className="bg-theme-card border border-theme-border rounded-2xl p-4 sm:p-5 shadow-card">
        <div className="text-xs font-bold uppercase tracking-wider text-theme-textMuted mb-3 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-theme-primary" />
          <span>Liquidity & Working Capital Strip</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-theme-border">
          {/* Cash in Hand */}
          <div className="flex items-center gap-3.5 sm:px-4 py-2 sm:py-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-theme-textSecondary">Cash in Register</p>
              <h4 className="text-lg font-bold text-theme-textPrimary">
                {currency} {Number(stats.cashInHand || 0).toLocaleString()}
              </h4>
            </div>
          </div>

          {/* Cash in Bank / Online */}
          <div className="flex items-center gap-3.5 sm:px-4 py-2 sm:py-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-theme-textSecondary">Bank & Online / Card</p>
              <h4 className="text-lg font-bold text-theme-textPrimary">
                {currency} {Number(stats.cashInBank || 0).toLocaleString()}
              </h4>
            </div>
          </div>

          {/* Total Payables / Khata Due */}
          <div className="flex items-center gap-3.5 sm:px-4 py-2 sm:py-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-theme-textSecondary">Total AR Khata / Credit Due</p>
              <h4 className="text-lg font-bold text-theme-textPrimary">
                {currency} {Number(stats.creditDue || 0).toLocaleString()}
              </h4>
            </div>
          </div>
        </div>
      </div>

      {/* 4. REVENUE TREND & ANALYTICS CHARTS (Left 65% / Right 35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (65%): Monthly Revenue Trend */}
        <div className="lg:col-span-8 bg-theme-card border border-theme-border rounded-2xl p-6 shadow-card space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-theme-textPrimary">Annual Revenue Trend ({new Date().getFullYear()})</h3>
              <p className="text-xs text-theme-textSecondary">Monthly revenue vs net profit breakdown in {currency}</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-theme-primary" /> Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-400" /> Profit
              </span>
            </div>
          </div>

          {/* Visual Vertical Bar Chart */}
          <div className="pt-4 pb-2">
            <div className="grid grid-cols-12 gap-2 sm:gap-3 items-end h-56 border-b border-theme-border pb-3">
              {months.map((m, idx) => {
                const rev = monthlyRevenue[idx] || 0;
                const prof = monthlyProfit[idx] || 0;
                const revHeight = maxMonthlyRev > 0 ? Math.max(8, Math.round((rev / maxMonthlyRev) * 100)) : 8;
                const profHeight = maxMonthlyRev > 0 ? Math.max(4, Math.round((prof / maxMonthlyRev) * 100)) : 4;

                return (
                  <div key={idx} className="flex flex-col items-center justify-end h-full group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-30 bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-xl whitespace-nowrap pointer-events-none">
                      <div className="font-bold">{m}</div>
                      <div>Rev: {currency} {rev.toLocaleString()}</div>
                      <div>Profit: {currency} {prof.toLocaleString()}</div>
                    </div>

                    <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1">
                      {/* Revenue Bar */}
                      <div
                        className="w-1/2 bg-theme-primary/80 group-hover:bg-theme-primary rounded-t transition-all duration-300"
                        style={{ height: `${revHeight}%` }}
                      />
                      {/* Profit Bar */}
                      <div
                        className="w-1/2 bg-emerald-400 group-hover:bg-emerald-500 rounded-t transition-all duration-300"
                        style={{ height: `${profHeight}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-theme-textMuted mt-2">{m}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom stats summary */}
          <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-theme-textMuted">Active Products</span>
              <p className="font-bold text-sm text-theme-textPrimary mt-0.5">{stats.totalStock || 0} Units</p>
            </div>
            <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-theme-textMuted">Stock Valuation</span>
              <p className="font-bold text-sm text-theme-textPrimary mt-0.5">{currency} {Number(stats.remainingStockValue || 0).toLocaleString()}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-theme-textMuted">Active Agents</span>
              <p className="font-bold text-sm text-theme-textPrimary mt-0.5">{stats.activeAgents || 0} Staff</p>
            </div>
          </div>
        </div>

        {/* Right Column (35%): Alerts & Top Selling */}
        <div className="lg:col-span-4 space-y-6">
          {/* Critical Stock Alerts */}
          <div className="bg-theme-card border border-theme-border rounded-2xl p-5 shadow-card space-y-3">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-theme-textPrimary">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Critical Stock Alerts ({lowStockAlerts.length})</span>
              </div>
              <Link to="/products?tab=stock" className="text-xs font-semibold text-theme-primary hover:underline">
                Restock
              </Link>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {lowStockAlerts.length === 0 ? (
                <div className="py-6 text-center text-xs text-theme-textMuted">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                  All products healthy! No low stock alerts.
                </div>
              ) : (
                lowStockAlerts.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs"
                  >
                    <div>
                      <p className="font-bold text-theme-textPrimary truncate max-w-[130px]">{it.itemName}</p>
                      <p className="text-[11px] text-theme-textMuted">{it.brand} • Min: {it.minAlert}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold text-[10px]">
                        {it.remaining} left
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="bg-theme-card border border-theme-border rounded-2xl p-5 shadow-card space-y-3">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <h3 className="font-bold text-sm text-theme-textPrimary">Top Selling Products</h3>
              <Link to="/reports" className="text-xs font-semibold text-theme-primary hover:underline">
                View Reports
              </Link>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {topSellingProducts.length === 0 ? (
                <div className="py-6 text-center text-xs text-theme-textMuted">
                  No sales recorded yet.
                </div>
              ) : (
                topSellingProducts.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-theme-primary/10 text-theme-primary font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-theme-textPrimary truncate max-w-[120px]">{p.name}</p>
                        <p className="text-[10px] text-theme-textMuted">{p.count} units sold</p>
                      </div>
                    </div>
                    <span className="font-bold text-theme-textPrimary">
                      {currency} {Number(p.revenue || 0).toLocaleString()}
                    </span>
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

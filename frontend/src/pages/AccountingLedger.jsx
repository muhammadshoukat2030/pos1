import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Wallet,
  Building,
  CreditCard,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  UserPlus,
  Search,
  FileText,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Receipt,
  Share2,
  MessageSquare,
  Eye,
  X,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import api from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { TableSkeleton } from "../components/LoadingSkeleton";
import { StatCard, StatusBadge } from "../components/common";
import CustomerKhataProfileModal from "../components/CustomerKhataProfileModal";

export default function AccountingLedger() {
  const { storeSettings } = useTheme();
  const { showToast } = useToast();
  const currency = storeSettings?.currency || "PKR";

  const [activeTab, setActiveTab] = useState("customers"); // 'customers' | 'expenses' | 'suppliers' | 'transactions'
  const [summary, setSummary] = useState({});
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCashInModalOpen, setIsCashInModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cashInAmount, setCashInAmount] = useState(0);
  const [cashInMethod, setCashInMethod] = useState("Cash");
  const [cashInNotes, setCashInNotes] = useState("");

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState(0);
  const [expenseCategory, setExpenseCategory] = useState("Utilities");
  const [expenseMethod, setExpenseMethod] = useState("Cash");
  const [expenseNotes, setExpenseNotes] = useState("");

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [newSupName, setNewSupName] = useState("");
  const [newSupCompany, setNewSupCompany] = useState("");
  const [newSupPhone, setNewSupPhone] = useState("");
  const [newSupBalance, setNewSupBalance] = useState(0);

  const [isPaySupplierModalOpen, setIsPaySupplierModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [paySupAmount, setPaySupAmount] = useState(0);
  const [paySupMethod, setPaySupMethod] = useState("Cash");
  const [paySupNotes, setPaySupNotes] = useState("");

  // Customer Khata Profile Modal
  const [selectedKhataCustId, setSelectedKhataCustId] = useState(null);
  const [isKhataProfileOpen, setIsKhataProfileOpen] = useState(false);
  const [custSearch, setCustSearch] = useState("");
  const [custFilter, setCustFilter] = useState("all"); // 'all' | 'debtors'
  const [error, setError] = useState(null);

  // Legacy Customer Statement Modal
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [customerStatement, setCustomerStatement] = useState(null);
  const [statementTransactions, setStatementTransactions] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumRes, custRes, supRes, transRes] = await Promise.allSettled([
        api.get("/ledger/summary"),
        api.get("/ledger/customers"),
        api.get("/ledger/suppliers"),
        api.get("/ledger/transactions")
      ]);

      if (sumRes.status === "fulfilled" && sumRes.value?.data?.success) {
        setSummary(sumRes.value.data.summary || {});
      }
      if (custRes.status === "fulfilled" && custRes.value?.data?.success) {
        setCustomers(Array.isArray(custRes.value.data.customers) ? custRes.value.data.customers : []);
      }
      if (supRes.status === "fulfilled" && supRes.value?.data?.success) {
        setSuppliers(Array.isArray(supRes.value.data.suppliers) ? supRes.value.data.suppliers : []);
      }
      if (transRes.status === "fulfilled" && transRes.value?.data?.success) {
        setTransactions(Array.isArray(transRes.value.data.transactions) ? transRes.value.data.transactions : []);
      }

      if (
        sumRes.status === "rejected" &&
        custRes.status === "rejected" &&
        supRes.status === "rejected" &&
        transRes.status === "rejected"
      ) {
        const msg = custRes.reason?.response?.data?.message || custRes.reason?.message || "Failed to load ledger records";
        setError(msg);
      }
    } catch (err) {
      setError(err.message || "Failed to load ledger");
      showToast("Error loading ledger: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Submit Cash In (Customer Khata Payment)
  const handleCashInSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer || cashInAmount <= 0) return;

    try {
      const res = await api.post("/ledger/cash-in", {
        customerId: selectedCustomer._id,
        amount: cashInAmount,
        paymentMethod: cashInMethod,
        notes: cashInNotes
      });

      if (res.data.success) {
        showToast(res.data.message || "Payment recorded successfully!", "success");
        setIsCashInModalOpen(false);
        setCashInAmount(0);
        setCashInNotes("");
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
    }
  };

  // Submit Cash Out (Store Expense)
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (expenseAmount <= 0) return;

    try {
      const res = await api.post("/ledger/cash-out", {
        amount: expenseAmount,
        expenseCategory,
        paymentMethod: expenseMethod,
        notes: expenseNotes
      });

      if (res.data.success) {
        showToast(res.data.message || "Expense recorded successfully!", "success");
        setIsExpenseModalOpen(false);
        setExpenseAmount(0);
        setExpenseNotes("");
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
    }
  };

  // Add Supplier
  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!newSupName.trim()) return;

    try {
      const res = await api.post("/ledger/suppliers", {
        name: newSupName.trim(),
        companyName: newSupCompany.trim(),
        phone: newSupPhone.trim(),
        initialBalance: newSupBalance
      });

      if (res.data.success) {
        showToast("Supplier created successfully!", "success");
        setIsSupplierModalOpen(false);
        setNewSupName("");
        setNewSupCompany("");
        setNewSupPhone("");
        setNewSupBalance(0);
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
    }
  };

  // Pay Supplier
  const handlePaySupplierSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupplier || paySupAmount <= 0) return;

    try {
      const res = await api.post("/ledger/supplier-payment", {
        supplierId: selectedSupplier._id,
        amount: paySupAmount,
        paymentMethod: paySupMethod,
        notes: paySupNotes
      });

      if (res.data.success) {
        showToast(res.data.message || "Supplier payment recorded!", "success");
        setIsPaySupplierModalOpen(false);
        setPaySupAmount(0);
        setPaySupNotes("");
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
    }
  };

  // View Customer Khata Profile
  const openCustomerStatement = (cust) => {
    if (!cust) return;
    setSelectedKhataCustId(cust._id);
    setIsKhataProfileOpen(true);
  };

  // WhatsApp Khata Payment Reminder
  const handleSendWhatsAppKhataReminder = (customer) => {
    if (!customer) return;
    const store = storeSettings?.storeName || "Universal Super Mart & POS";
    const phone = customer.phone ? customer.phone.replace(/[^0-9]/g, "") : "";
    const cleanPhone = phone.startsWith("0") ? "92" + phone.slice(1) : phone;

    const balance = (customer.currentBalance || 0).toLocaleString();
    const message =
      `محترم جناب *${customer.name}* صاحب،\n\n` +
      `السلام علیکم!\n` +
      `برائے مہربانی نوٹ فرمائیں کہ آپ کے کھاتہ برائے *${store}* میں بقایا واجب الادا رقم *PKR ${balance}* ہے۔\n\n` +
      `درخواست ہے کہ جلد از جلد بقایا رقم ادا فرما کر کھاتہ کلیئر فرمائیں۔\n\n` +
      `شکریہ!\n` +
      `*${store}*\n` +
      `رابطہ فون: ${storeSettings?.phone || ""}`;

    const encoded = encodeURIComponent(message);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(waUrl, "_blank");
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-theme-textPrimary flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-theme-primary" /> Accounting & Customer Khata
          </h1>
          <p className="text-xs text-theme-textSecondary mt-0.5">
            Accounts receivable (Khata), supplier payables, and daily cash-in / cash-out ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 text-rose-600 font-bold text-xs hover:bg-rose-100 transition cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" /> Record Cash Expense
          </button>
          <button
            onClick={() => {
              const firstCust = Array.isArray(customers) && customers.length > 0 ? customers[0] : null;
              if (firstCust) {
                setSelectedCustomer(firstCust);
                setIsCashInModalOpen(true);
              } else {
                showToast("Please create a customer first before receiving Khata payments.", "info");
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition transform active:scale-95 cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" /> Receive Khata Cash-In
          </button>
        </div>
      </div>

      {/* Friendly Error Banner with Retry */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                Notice: Could not load complete ledger records
              </p>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-0.5">
                {error}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Loading State Skeleton */}
      {loading && !customers.length && !Object.keys(summary).length ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-black/5 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
          <div className="bg-theme-card border border-theme-border rounded-lg p-4">
            <TableSkeleton rows={6} columns={6} />
          </div>
        </div>
      ) : (
        <>
      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
        <StatCard
          title="Customer Khata (AR)"
          value={`${currency} ${(summary?.totalReceivable || 0).toLocaleString()}`}
          icon={CreditCard}
          badgeText="Receivables"
          badgeType="warning"
          iconBg="bg-amber-500/10 dark:bg-amber-950/40"
          iconColor="text-amber-600 dark:text-amber-400"
          subtitle="Pending customer credits"
        />

        <StatCard
          title="Supplier Payables (AP)"
          value={`${currency} ${(summary?.totalPayable || 0).toLocaleString()}`}
          icon={Building}
          badgeText="Payables"
          badgeType="danger"
          iconBg="bg-rose-500/10 dark:bg-rose-950/40"
          iconColor="text-rose-600 dark:text-rose-400"
          subtitle="Owed to inventory vendors"
        />

        <StatCard
          title="Today's Cash In"
          value={`${currency} ${(summary?.todayCashIn || 0).toLocaleString()}`}
          icon={ArrowDownLeft}
          badgeText="Inflow"
          badgeType="success"
          iconBg="bg-emerald-500/10 dark:bg-emerald-950/40"
          iconColor="text-emerald-600 dark:text-emerald-400"
          subtitle="Khata recoveries today"
        />

        <StatCard
          title="Today's Cash Out"
          value={`${currency} ${(summary?.todayCashOut || 0).toLocaleString()}`}
          icon={ArrowUpRight}
          badgeText="Outflow"
          badgeType="neutral"
          iconBg="bg-slate-500/10 dark:bg-white/5"
          iconColor="text-slate-600 dark:text-slate-300"
          subtitle="Expenses & vendor payments"
        />
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-theme-border pb-1">
        {[
          { id: "customers", label: `Customer Khata (${Array.isArray(customers) ? customers.length : 0})` },
          { id: "transactions", label: `Ledger Log (${Array.isArray(transactions) ? transactions.length : 0})` },
          { id: "suppliers", label: `Suppliers (${Array.isArray(suppliers) ? suppliers.length : 0})` }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === t.id
                ? "bg-emerald-50 dark:bg-[#133b2a] text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-300/60 dark:border-emerald-700/50 shadow-2xs"
                : "text-theme-textSecondary hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: CUSTOMERS KHATA TABLE */}
      {activeTab === "customers" && (() => {
        const custList = Array.isArray(customers) ? customers : [];
        const filteredCustomers = custList.filter((c) => {
          if (custFilter === "debtors" && (c.currentBalance || 0) <= 0) {
            return false;
          }
          if (!custSearch.trim()) return true;
          const q = custSearch.toLowerCase().trim();
          const nameMatch = (c.name || "").toLowerCase().includes(q);
          const phoneMatch = (c.phone || "").toLowerCase().includes(q);
          const idMatch = (c.customerID || "").toLowerCase().includes(q);
          return nameMatch || phoneMatch || idMatch;
        });

        return (
          <div className="space-y-3">
            {/* Search & Filter Bar */}
            <div className="bg-theme-card border border-theme-border rounded-lg p-2.5 sm:p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={custSearch}
                  onChange={(e) => setCustSearch(e.target.value)}
                  placeholder="Search customer by name, phone or ID (e.g. CUST-0001)..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-lg text-theme-textPrimary placeholder:text-theme-textMuted focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                {custSearch && (
                  <button
                    type="button"
                    onClick={() => setCustSearch("")}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCustFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    custFilter === "all"
                      ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                      : "bg-black/5 dark:bg-white/5 text-theme-textSecondary hover:bg-black/10"
                  }`}
                >
                  All ({customers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCustFilter("debtors")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    custFilter === "debtors"
                      ? "bg-rose-600 text-white"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
                  }`}
                >
                  Pending Balances ({customers.filter((c) => (c.currentBalance || 0) > 0).length})
                </button>
              </div>
            </div>

            {/* Customers Table */}
            <div className="bg-theme-card border border-theme-border rounded-lg shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/5 dark:bg-white/5 text-[11px] font-bold text-theme-textMuted uppercase border-b border-theme-border">
                    <tr>
                      <th className="p-3">Customer ID</th>
                      <th className="p-3">Customer Name</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3 text-right">Total Purchases</th>
                      <th className="p-3 text-right">Balance Due (Khata)</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center w-48">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-theme-textMuted">
                          No matching Khata customers found.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((c) => (
                        <tr
                          key={c._id}
                          className="hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                          onClick={() => openCustomerStatement(c)}
                        >
                          <td className="p-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            {c.customerID || "Assigned"}
                          </td>
                          <td className="p-3 font-bold text-theme-textPrimary">{c.name}</td>
                          <td className="p-3 text-theme-textSecondary font-mono">{c.phone || "—"}</td>
                          <td className="p-3 text-right text-theme-textSecondary font-mono font-bold">
                            {currency} {(c.totalPurchases || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-black">
                            <span className={c.currentBalance > 0 ? "text-rose-600 dark:text-rose-400 font-mono text-sm" : "text-theme-textMuted font-mono"}>
                              {currency} {(c.currentBalance || 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                              {c.status || "Active"}
                            </span>
                          </td>
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openCustomerStatement(c)}
                                className="px-2.5 py-1 rounded-lg border border-theme-border hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-[11px] text-theme-textPrimary transition flex items-center gap-1 cursor-pointer"
                                title="Open Khata Profile"
                              >
                                <Eye className="w-3 h-3 text-theme-primary" /> Profile
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCustomer(c);
                                  setIsCashInModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 cursor-pointer"
                              >
                                <ArrowDownLeft className="w-3 h-3" /> Receive
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendWhatsAppKhataReminder(c)}
                                className="p-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 transition cursor-pointer"
                                title="Send WhatsApp Khata Reminder"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 2: TRANSACTIONS LOG */}
      {activeTab === "transactions" && (
        <div className="bg-theme-card border border-theme-border rounded-lg shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/5 dark:bg-white/5 text-[11px] font-bold text-theme-textMuted uppercase border-b border-theme-border">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Entity / Customer / Category</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3">Payment Mode</th>
                  <th className="p-3">Notes</th>
                  <th className="p-3 text-center">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-theme-textMuted">
                      No financial transactions logged yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => {
                    const isCashIn = t.transactionType === "Payment Received";
                    return (
                      <tr key={t._id} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                        <td className="p-3 font-mono text-theme-textSecondary">
                          {new Date(t.date).toLocaleDateString()} {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={t.transactionType} size="xs" />
                        </td>
                        <td className="p-3 font-medium text-theme-textPrimary">
                          {t.customerName || t.supplierName || t.expenseCategory || "—"}
                        </td>
                        <td className={`p-3 text-right font-black ${isCashIn ? "text-emerald-600" : "text-theme-textPrimary"}`}>
                          {isCashIn ? "+" : "-"} {currency} {t.amount?.toLocaleString()}
                        </td>
                        <td className="p-3 text-theme-textSecondary">{t.paymentMethod || "Cash"}</td>
                        <td className="p-3 text-theme-textMuted truncate max-w-xs">{t.notes || "—"}</td>
                        <td className="p-3 text-center text-theme-textMuted">{t.recordedBy}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SUPPLIERS TABLE */}
      {activeTab === "suppliers" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsSupplierModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-theme-primary text-white font-bold text-xs shadow-md"
            >
              + Add Supplier
            </button>
          </div>

          <div className="bg-theme-card border border-theme-border rounded-lg shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/5 dark:bg-white/5 text-[11px] font-bold text-theme-textMuted uppercase border-b border-theme-border">
                  <tr>
                    <th className="p-3">Supplier / Vendor</th>
                    <th className="p-3">Company</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3 text-right">Balance Due (Payable)</th>
                    <th className="p-3 text-center w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-theme-textMuted">
                        No suppliers recorded. Click "+ Add Supplier" to create one.
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((s) => (
                      <tr key={s._id} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                        <td className="p-3 font-bold text-theme-textPrimary">{s.name}</td>
                        <td className="p-3 text-theme-textSecondary">{s.companyName || "—"}</td>
                        <td className="p-3 font-mono text-theme-textSecondary">{s.phone || "—"}</td>
                        <td className="p-3 text-right font-black text-rose-600">
                          {currency} {(s.balanceDue || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSupplier(s);
                              setIsPaySupplierModalOpen(true);
                            }}
                            className="px-3 py-1 rounded-lg bg-theme-primary hover:bg-theme-dark text-white font-bold text-[11px] shadow-sm"
                          >
                            Pay Vendor
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* MODAL 1: RECEIVE CASH IN */}
      {isCashInModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-lg p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <h3 className="font-bold text-base text-emerald-600 flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5" /> Receive Khata Cash-In
              </h3>
              <button onClick={() => setIsCashInModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCashInSubmit} className="space-y-3 text-xs">
              <div>
                <p className="font-bold text-sm text-theme-textPrimary">{selectedCustomer.name}</p>
                <p className="text-amber-600 font-bold">Outstanding Khata: {currency} {selectedCustomer.currentBalance?.toLocaleString()}</p>
              </div>

              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Payment Amount ({currency}) *</label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  value={cashInAmount}
                  onChange={(e) => setCashInAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-black text-emerald-600 text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Payment Mode</label>
                <select
                  value={cashInMethod}
                  onChange={(e) => setCashInMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-medium"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Online">Online / EasyPaisa / JazzCash</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Notes / Reference</label>
                <input
                  type="text"
                  value={cashInNotes}
                  onChange={(e) => setCashInNotes(e.target.value)}
                  placeholder="e.g. Cleared past invoice"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setIsCashInModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-theme-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save Cash In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD EXPENSE */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-lg p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <h3 className="font-bold text-base text-rose-600 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5" /> Record Store Expense
              </h3>
              <button onClick={() => setIsExpenseModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Expense Category</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-bold"
                >
                  <option value="Utilities">Electricity / Water / Internet Bill</option>
                  <option value="Rent">Shop Rent</option>
                  <option value="Staff Meals / Refreshment">Staff Meals / Tea / Refreshment</option>
                  <option value="Transport / Freight">Transport / Delivery Charges</option>
                  <option value="Maintenance">Shop Maintenance / Cleaning</option>
                  <option value="Other">Other Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Amount ({currency}) *</label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-black text-rose-600 text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Notes / Description</label>
                <input
                  type="text"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="e.g. Paid electricity bill for Jan"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-theme-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CUSTOMER STATEMENT */}
      {isStatementModalOpen && customerStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-xl p-4 sm:p-5 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <div>
                <h3 className="font-extrabold text-lg text-theme-textPrimary flex items-center gap-2">
                  <FileText className="w-5 h-5 text-theme-primary" /> Khata Statement: {customerStatement.name}
                </h3>
                <p className="text-xs text-amber-600 font-bold mt-0.5">
                  Current Balance Due: {currency} {customerStatement.currentBalance?.toLocaleString()}
                </p>
              </div>
              <button onClick={() => setIsStatementModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/5 dark:bg-white/5 text-[10px] font-bold text-theme-textMuted uppercase sticky top-0">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Type</th>
                    <th className="p-2 text-right">Amount</th>
                    <th className="p-2 text-right">Balance After</th>
                    <th className="p-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {statementTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-theme-textMuted">
                        No transactions found for this customer.
                      </td>
                    </tr>
                  ) : (
                    statementTransactions.map((st) => (
                      <tr key={st._id} className="hover:bg-black/5">
                        <td className="p-2 font-mono text-theme-textSecondary">
                          {new Date(st.date).toLocaleDateString()}
                        </td>
                        <td className="p-2 font-bold">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] ${
                              st.transactionType === "Payment Received"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {st.transactionType}
                          </span>
                        </td>
                        <td className="p-2 text-right font-black">
                          {currency} {st.amount?.toLocaleString()}
                        </td>
                        <td className="p-2 text-right text-theme-textMuted font-mono">
                          {currency} {st.newBalance?.toLocaleString()}
                        </td>
                        <td className="p-2 text-theme-textSecondary truncate max-w-xs">{st.notes}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-theme-border">
              <button
                type="button"
                onClick={() => setIsStatementModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-theme-primary text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: COMPLETE CUSTOMER KHATA PROFILE MODAL */}
      <CustomerKhataProfileModal
        customerId={selectedKhataCustId}
        isOpen={isKhataProfileOpen}
        onClose={() => setIsKhataProfileOpen(false)}
        onPaymentRecorded={fetchData}
      />
    </div>
  );
}

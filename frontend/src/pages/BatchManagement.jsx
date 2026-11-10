import React, { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import {
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Boxes,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Building2,
  ShieldAlert,
  Info,
  Layers,
  Sparkles,
  Calendar,
  AlertCircle
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import ModalShell from "../components/common/ModalShell";
import StatCard from "../components/common/StatCard";

export default function BatchManagement() {
  const { storeSettings } = useTheme();
  const currency = storeSettings?.currency || "PKR";

  // Data States
  const [batches, setBatches] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Filters
  const [filterTab, setFilterTab] = useState("all"); // "all" | "near-expiry" | "expired" | "quarantined"
  const [branchFilter, setBranchFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQuarantineModalOpen, setIsQuarantineModalOpen] = useState(false);
  const [selectedBatchForQuarantine, setSelectedBatchForQuarantine] = useState(null);
  const [quarantineReason, setQuarantineReason] = useState("");

  // New Batch Form State
  const [batchForm, setBatchForm] = useState({
    productId: "",
    batchNumber: "",
    branchId: "",
    manufacturingDate: "",
    expiryDate: "",
    quantityReceived: 100,
    costPrice: 0,
    salePrice: 0,
    supplierName: "",
    notes: ""
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Toast Helper
  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Batches & Products
  const fetchData = async () => {
    try {
      setLoading(true);
      const [batchRes, prodRes] = await Promise.all([
        api.get("/batches"),
        api.get("/products", { params: { all: "true" } })
      ]);

      if (batchRes.data.success) {
        setBatches(batchRes.data.batches || []);
      }
      if (prodRes.data.success) {
        setProducts(prodRes.data.products || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Summary Metrics
  const activeBatchesCount = useMemo(
    () => batches.filter((b) => b.status === "Active" && b.quantityRemaining > 0).length,
    [batches]
  );
  const nearExpiryCount = useMemo(
    () => batches.filter((b) => b.isNearExpiry && b.quantityRemaining > 0 && b.status === "Active").length,
    [batches]
  );
  const expiredCount = useMemo(
    () => batches.filter((b) => (b.isExpired || b.status === "Expired") && b.quantityRemaining > 0).length,
    [batches]
  );
  const totalBatchUnits = useMemo(
    () => batches.reduce((sum, b) => sum + (b.quantityRemaining || 0), 0),
    [batches]
  );

  // Filtered Batches List
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      // Tab filter
      if (filterTab === "near-expiry" && (!b.isNearExpiry || b.quantityRemaining <= 0)) return false;
      if (filterTab === "expired" && (!b.isExpired || b.quantityRemaining <= 0)) return false;
      if (filterTab === "quarantined" && b.status !== "Quarantined") return false;
      if (filterTab === "all" && b.status === "Depleted") return true; // keep visible in all

      // Branch filter
      if (branchFilter !== "all") {
        if (!b.branchId || (b.branchId._id || b.branchId) !== branchFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pName = b.productId?.itemName?.toLowerCase() || "";
        const sku = b.productId?.stockID?.toLowerCase() || "";
        const bNum = b.batchNumber?.toLowerCase() || "";
        const sup = b.supplierName?.toLowerCase() || "";
        return pName.includes(q) || sku.includes(q) || bNum.includes(q) || sup.includes(q);
      }

      return true;
    });
  }, [batches, filterTab, branchFilter, searchQuery]);

  // Open Add Batch Modal
  const openAddModal = () => {
    const today = new Date();
    const oneYearLater = new Date();
    oneYearLater.setFullYear(today.getFullYear() + 1);

    const defaultBranch = branches.find((b) => b.isDefault) || branches[0];

    setBatchForm({
      productId: products[0]?._id || "",
      batchNumber: `BAT-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}-${Math.floor(100 + Math.random() * 900)}`,
      branchId: defaultBranch ? defaultBranch._id : "",
      manufacturingDate: today.toISOString().split("T")[0],
      expiryDate: oneYearLater.toISOString().split("T")[0],
      quantityReceived: 50,
      costPrice: products[0]?.costPrice || 0,
      salePrice: products[0]?.salePrice || products[0]?.rate || 0,
      supplierName: "",
      notes: ""
    });
    setIsAddModalOpen(true);
  };

  // Handle Product Selection Change in Form
  const handleProductSelect = (pId) => {
    const p = products.find((prod) => prod._id === pId);
    setBatchForm((prev) => ({
      ...prev,
      productId: pId,
      costPrice: p ? p.costPrice || 0 : prev.costPrice,
      salePrice: p ? p.salePrice || p.rate || 0 : prev.salePrice
    }));
  };

  // Submit New Batch
  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!batchForm.productId || !batchForm.batchNumber.trim() || !batchForm.expiryDate) {
      showToast("Please fill all required fields.", "error");
      return;
    }

    try {
      setFormSubmitting(true);
      const res = await api.post("/batches", batchForm);
      if (res.data.success) {
        showToast(res.data.message, "success");
        setIsAddModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Quarantine Modal
  const openQuarantineModal = (b) => {
    setSelectedBatchForQuarantine(b);
    setQuarantineReason(b.isExpired ? "Expired stock quarantine" : "Damaged / Defect recall");
    setIsQuarantineModalOpen(true);
  };

  // Execute Quarantine
  const handleConfirmQuarantine = async (e) => {
    e.preventDefault();
    if (!selectedBatchForQuarantine) return;

    try {
      const res = await api.post(`/batches/${selectedBatchForQuarantine._id}/quarantine`, {
        reason: quarantineReason
      });
      if (res.data.success) {
        showToast(res.data.message, "success");
        setIsQuarantineModalOpen(false);
        setSelectedBatchForQuarantine(null);
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 text-sm font-bold border transition transform duration-200 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/30"
              : toast.type === "error"
              ? "bg-rose-600 text-white border-rose-500 shadow-rose-900/30"
              : "bg-slate-800 text-white border-slate-700"
          }`}
        >
          {toast.type === "success" && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
          {toast.type === "error" && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          {toast.type === "info" && <Info className="w-5 h-5 flex-shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-theme-textPrimary flex items-center gap-2.5">
            <CalendarClock className="w-7 h-7 text-theme-primary" />
            Batch, Lot & Expiry Management (FEFO)
          </h1>
          <p className="text-xs text-theme-textMuted mt-0.5">
            Automated First-Expiry-First-Out dispatch, lot integrity, and zero-loss shelf life control.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={fetchData}
            className="px-3.5 py-2 rounded-xl bg-theme-card border border-theme-border text-theme-textSecondary hover:bg-black/5 dark:hover:bg-white/5 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-theme-primary hover:bg-theme-dark text-white text-xs font-extrabold transition flex items-center gap-1.5 shadow-md shadow-theme-primary/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Receive New Batch
          </button>
        </div>
      </div>

      {/* Top Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
        <StatCard
          title="Active Batches"
          value={activeBatchesCount}
          icon={CheckCircle2}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-500"
          badgeText="Sellable Lots"
          badgeType="success"
          subtitle="Non-Expired In-Stock Batches"
        />

        <StatCard
          title="Expiring Soon (≤30 Days)"
          value={nearExpiryCount}
          icon={Clock}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-500"
          badgeText={nearExpiryCount > 0 ? "Action Required" : "All Fresh"}
          badgeType={nearExpiryCount > 0 ? "warning" : "success"}
          subtitle="Priority FEFO Shelf Stock"
        />

        <StatCard
          title="Expired Batches"
          value={expiredCount}
          icon={ShieldAlert}
          iconBg="bg-rose-500/10"
          iconColor="text-rose-500"
          badgeText={expiredCount > 0 ? "Blocked from POS" : "Zero Expired"}
          badgeType={expiredCount > 0 ? "danger" : "neutral"}
          subtitle="Sale Blocked by Safety Guard"
        />

        <StatCard
          title="Total Batched Units"
          value={totalBatchUnits.toLocaleString()}
          icon={Boxes}
          iconBg="bg-emerald-500/10 dark:bg-emerald-950/40"
          iconColor="text-emerald-700 dark:text-emerald-400"
          badgeText="Traceable Stock"
          badgeType="info"
          subtitle="Aggregate Tracked Lot Units"
        />
      </div>

      {/* Critical Expiry Alert Banner if Expired or Near Expiry Stock exists */}
      {(expiredCount > 0 || nearExpiryCount > 0) && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <strong>Quality & Safety Notice:</strong> You have{" "}
              {expiredCount > 0 && <span className="font-extrabold text-rose-600">{expiredCount} expired batch(es) (sale blocked)</span>}
              {expiredCount > 0 && nearExpiryCount > 0 && " and "}
              {nearExpiryCount > 0 && <span className="font-extrabold text-amber-700 dark:text-amber-300">{nearExpiryCount} batch(es) expiring in ≤30 days</span>}.
              FEFO algorithm automatically allocates earliest-expiring goods first.
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFilterTab(expiredCount > 0 ? "expired" : "near-expiry")}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition flex-shrink-0"
          >
            Review Lots
          </button>
        </div>
      )}

      {/* Filters & Search Control Strip */}
      <div className="bg-theme-card border border-theme-border rounded-lg p-4 shadow-card flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto">
          <button
            onClick={() => setFilterTab("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterTab === "all"
                ? "bg-theme-primary text-white shadow-sm"
                : "bg-black/5 dark:bg-white/5 text-theme-textSecondary hover:bg-black/10"
            }`}
          >
            All Lots ({batches.length})
          </button>

          <button
            onClick={() => setFilterTab("near-expiry")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
              filterTab === "near-expiry"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Near Expiry ({nearExpiryCount})
          </button>

          <button
            onClick={() => setFilterTab("expired")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
              filterTab === "expired"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Expired ({expiredCount})
          </button>

          <button
            onClick={() => setFilterTab("quarantined")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterTab === "quarantined"
                ? "bg-slate-700 text-white shadow-sm"
                : "bg-black/5 dark:bg-white/5 text-theme-textSecondary hover:bg-black/10"
            }`}
          >
            Quarantined
          </button>
        </div>

        {/* Branch Filter & Search */}
        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          {branches.length > 1 && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-theme-border text-xs font-bold text-theme-textPrimary focus:outline-none"
            >
              <option value="all">All Locations</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}

          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-theme-textMuted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lot, SKU, item, supplier..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Batches Data Table */}
      <div className="bg-theme-card border border-theme-border rounded-lg shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/5 dark:bg-white/5 text-theme-textMuted uppercase font-bold tracking-wider border-b border-theme-border">
              <tr>
                <th className="py-3 px-4">Item & Product SKU</th>
                <th className="py-3 px-3">Batch / Lot #</th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-3 text-center">Expiry Date & Countdown</th>
                <th className="py-3 px-3 text-center">Remaining / Received</th>
                <th className="py-3 px-3 text-right">Cost / Sale</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-theme-textMuted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-theme-primary" />
                    Loading traceable product batches...
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-theme-textMuted">
                    <CalendarClock className="w-8 h-8 mx-auto mb-2 text-theme-textMuted opacity-40" />
                    No product batches found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => {
                  const p = batch.productId;
                  const expDate = new Date(batch.expiryDate);
                  const isDepleted = batch.quantityRemaining <= 0;
                  const isQuarantined = batch.status === "Quarantined";

                  return (
                    <tr key={batch._id} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-theme-textPrimary">
                          {p?.itemName || "Unnamed Product"}
                        </div>
                        <div className="text-[10px] text-theme-textMuted font-mono">
                          SKU: {p?.stockID || "—"} • {p?.category || "General"}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono font-black text-theme-primary">
                        {batch.batchNumber}
                        {batch.supplierName && (
                          <div className="text-[10px] text-theme-textMuted font-sans">
                            {batch.supplierName}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-[11px] font-semibold text-theme-textSecondary">
                          {batch.branchId?.name || batch.branchName || "HQ Store"}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="font-bold text-theme-textPrimary">
                          {expDate.toLocaleDateString()}
                        </div>
                        {batch.isExpired ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 inline-block mt-0.5">
                            Expired ({Math.abs(batch.daysUntilExpiry)}d ago)
                          </span>
                        ) : batch.isNearExpiry ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 inline-block mt-0.5">
                            Expires in {batch.daysUntilExpiry}d
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                            {batch.daysUntilExpiry} days left
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="font-black text-sm">
                          <span
                            className={
                              batch.isExpired
                                ? "text-rose-600 line-through"
                                : batch.quantityRemaining <= 10
                                ? "text-amber-600"
                                : "text-theme-textPrimary"
                            }
                          >
                            {batch.quantityRemaining}
                          </span>
                          <span className="text-[11px] font-normal text-theme-textMuted">
                            {" "}
                            / {batch.quantityReceived} {p?.unit || "pcs"}
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-24 h-1.5 bg-black/10 dark:bg-white/10 rounded-full mx-auto mt-1 overflow-hidden">
                          <div
                            className={`h-full ${
                              batch.isExpired
                                ? "bg-rose-500"
                                : batch.isNearExpiry
                                ? "bg-amber-500"
                                : "bg-theme-primary"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round((batch.quantityRemaining / (batch.quantityReceived || 1)) * 100)
                              )}%`
                            }}
                          />
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-theme-textPrimary">
                          {currency} {batch.salePrice}
                        </div>
                        <div className="text-[10px] text-theme-textMuted">
                          Cost: {currency} {batch.costPrice}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {isQuarantined ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                            Quarantined
                          </span>
                        ) : batch.isExpired ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                            Expired
                          </span>
                        ) : isDepleted ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            Depleted
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {!isQuarantined && !isDepleted && (
                          <button
                            type="button"
                            onClick={() => openQuarantineModal(batch)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-xs font-bold transition flex items-center gap-1 mx-auto"
                            title="Quarantine or Recall Batch"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Quarantine
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: RECEIVE NEW PRODUCT BATCH */}
      <ModalShell
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Receive New Inventory Batch (Lot)"
        icon={CalendarClock}
        subtitle="Record incoming expiration-dated lot with supplier metadata and automatic stock sync."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateBatch} className="space-y-4">
          {/* Product Selection */}
          <div>
            <label className="text-xs font-bold text-theme-textMuted uppercase mb-1 block">
              Master Product Catalog Item *
            </label>
            <select
              value={batchForm.productId}
              onChange={(e) => handleProductSelect(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-theme-border font-bold text-theme-textPrimary focus:ring-2 focus:ring-theme-primary focus:outline-none"
            >
              <option value="">-- Choose Product --</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.itemName} ({p.stockID}) - [{p.category}]
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-theme-textMuted uppercase mb-1 block">
                Batch / Lot Number *
              </label>
              <input
                type="text"
                value={batchForm.batchNumber}
                onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value.toUpperCase() })}
                required
                placeholder="e.g. BAT-2026-001"
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:outline-none uppercase"
              />
            </div>

            {branches.length > 0 && (
              <div>
                <label className="text-xs font-bold text-theme-textMuted uppercase mb-1 block">
                  Target Store / Location
                </label>
                <select
                  value={batchForm.branchId}
                  onChange={(e) => setBatchForm({ ...batchForm, branchId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-theme-border font-semibold text-theme-textPrimary focus:ring-2 focus:ring-theme-primary focus:outline-none"
                >
                  <option value="">Central Store / Main</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name} ({b.type === "warehouse" ? "Warehouse" : "Store"}) {b.isDefault ? "★ HQ" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-theme-textMuted uppercase mb-1 block">
                Manufacturing Date
              </label>
              <input
                type="date"
                value={batchForm.manufacturingDate}
                onChange={(e) => setBatchForm({ ...batchForm, manufacturingDate: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-theme-textMuted uppercase mb-1 block">
                Expiry Date * (Must be in future)
              </label>
              <input
                type="date"
                value={batchForm.expiryDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:outline-none font-bold text-theme-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-theme-textMuted uppercase mb-1 block">
                Received Qty *
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={batchForm.quantityReceived}
                onChange={(e) => setBatchForm({ ...batchForm, quantityReceived: parseFloat(e.target.value) || 0 })}
                required
                className="w-full px-3 py-2 text-xs font-bold bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:outline-none text-right"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-theme-textMuted uppercase mb-1 block">
                Cost Price ({currency})
              </label>
              <input
                type="number"
                step="any"
                value={batchForm.costPrice}
                onChange={(e) => setBatchForm({ ...batchForm, costPrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs font-bold bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:outline-none text-right"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-theme-textMuted uppercase mb-1 block">
                Sale Price ({currency})
              </label>
              <input
                type="number"
                step="any"
                value={batchForm.salePrice}
                onChange={(e) => setBatchForm({ ...batchForm, salePrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs font-bold bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:outline-none text-right"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-theme-textMuted uppercase mb-1 block">
              Supplier Name / Vendor Reference
            </label>
            <input
              type="text"
              value={batchForm.supplierName}
              onChange={(e) => setBatchForm({ ...batchForm, supplierName: e.target.value })}
              placeholder="e.g. Nestlé Pakistan or Metro Cash & Carry"
              className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-theme-textMuted uppercase mb-1 block">
              Remarks / Lot Notes
            </label>
            <input
              type="text"
              value={batchForm.notes}
              onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
              placeholder="e.g. Promo shipment with tamper-evident seal..."
              className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-theme-border">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-theme-textSecondary text-xs font-bold hover:bg-black/10 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-5 py-2 rounded-xl bg-theme-primary hover:bg-theme-dark text-white text-xs font-extrabold shadow-md transition disabled:opacity-50"
            >
              {formSubmitting ? "Receiving Batch..." : "Receive & Stock Batch"}
            </button>
          </div>
        </form>
      </ModalShell>

      {/* MODAL: QUARANTINE BATCH */}
      <ModalShell
        isOpen={isQuarantineModalOpen}
        onClose={() => setIsQuarantineModalOpen(false)}
        title="Quarantine / Recall Batch"
        icon={ShieldAlert}
        subtitle={selectedBatchForQuarantine ? `Batch #${selectedBatchForQuarantine.batchNumber} (${selectedBatchForQuarantine.productId?.itemName})` : "Quarantine Lot"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmQuarantine} className="space-y-4">
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 space-y-1">
            <strong>Warning:</strong> Quarantining will permanently remove the remaining{" "}
            <strong>
              {selectedBatchForQuarantine?.quantityRemaining} {selectedBatchForQuarantine?.productId?.unit || "pcs"}
            </strong>{" "}
            from sellable inventory. This prevents cashiers from billing expired or compromised goods.
          </div>

          <div>
            <label className="text-xs font-bold text-theme-textMuted uppercase mb-1 block">
              Reason for Quarantine *
            </label>
            <input
              type="text"
              value={quarantineReason}
              onChange={(e) => setQuarantineReason(e.target.value)}
              required
              placeholder="e.g. Past expiration date, packaging defect, manufacturer recall..."
              className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-theme-border">
            <button
              type="button"
              onClick={() => setIsQuarantineModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-theme-textSecondary text-xs font-bold hover:bg-black/10 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-md transition"
            >
              Confirm Quarantine
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}

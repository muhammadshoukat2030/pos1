import React, { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import {
  Building2,
  Warehouse,
  Store,
  ArrowRightLeft,
  Plus,
  Search,
  SlidersHorizontal,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit2,
  MapPin,
  Phone,
  Mail,
  User,
  Boxes,
  History,
  TrendingDown,
  Info,
  Calendar,
  Layers
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import ModalShell from "../components/common/ModalShell";
import StatCard from "../components/common/StatCard";

export default function BranchesLocations() {
  const { storeSettings } = useTheme();
  const currency = storeSettings?.currency || "PKR";

  // Active Tab: "branches" | "stock" | "transfer" | "history"
  const [activeTab, setActiveTab] = useState("branches");

  // Core Data States
  const [branches, setBranches] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Tab 2: Location Stock Viewer State
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [branchInventory, setBranchInventory] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockSearch, setStockSearch] = useState("");
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Tab 3: Stock Transfer Form State
  const [allProducts, setAllProducts] = useState([]);
  const [sourceBranchId, setSourceBranchId] = useState("");
  const [destBranchId, setDestBranchId] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [transferItems, setTransferItems] = useState([
    { productId: "", quantity: 1, unit: "pcs", conversionFactor: 1, maxAvailable: 0 }
  ]);
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  // Modals
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({
    name: "",
    code: "",
    type: "store",
    phone: "",
    email: "",
    address: "",
    city: "",
    managerName: "",
    isDefault: false,
    notes: ""
  });

  // Quick Stock Adjust Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustDelta, setAdjustDelta] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  // Toast Helper
  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Branches & Summary
  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await api.get("/branches");
      if (res.data.success) {
        setBranches(res.data.branches || []);
        if (!selectedBranchId && res.data.branches?.length > 0) {
          const defaultB = res.data.branches.find((b) => b.isDefault) || res.data.branches[0];
          setSelectedBranchId(defaultB._id);
          if (!sourceBranchId) setSourceBranchId(defaultB._id);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Transfers History
  const fetchTransfers = async () => {
    try {
      const res = await api.get("/branches/transfers");
      if (res.data.success) {
        setTransfers(res.data.transfers || []);
      }
    } catch (err) {
      console.warn("Could not fetch transfers:", err.message);
    }
  };

  // Fetch Product Catalog for Transfer Item Selection
  const fetchAllProducts = async () => {
    try {
      const res = await api.get("/products", { params: { all: "true" } });
      if (res.data.success) {
        setAllProducts(res.data.products || []);
      }
    } catch (err) {
      console.warn("Could not fetch products:", err.message);
    }
  };

  // Fetch Location Specific Stock
  const fetchBranchStock = async (branchId) => {
    if (!branchId) return;
    try {
      setStockLoading(true);
      const res = await api.get(`/branches/${branchId}/stock`, {
        params: {
          search: stockSearch || undefined,
          lowStockOnly: lowStockFilter ? "true" : undefined
        }
      });
      if (res.data.success) {
        setBranchInventory(res.data.inventory || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchTransfers();
    fetchAllProducts();
  }, []);

  useEffect(() => {
    if (activeTab === "stock" && selectedBranchId) {
      fetchBranchStock(selectedBranchId);
    }
  }, [activeTab, selectedBranchId, stockSearch, lowStockFilter]);

  // Overall Statistics
  const totalStores = useMemo(() => branches.filter((b) => b.type === "store").length, [branches]);
  const totalWarehouses = useMemo(() => branches.filter((b) => b.type === "warehouse").length, [branches]);
  const totalStockUnits = useMemo(() => branches.reduce((sum, b) => sum + (b.totalUnits || 0), 0), [branches]);
  const totalLowStock = useMemo(() => branches.reduce((sum, b) => sum + (b.lowStockCount || 0), 0), [branches]);

  // Handle Save / Update Branch
  const handleSaveBranch = async (e) => {
    e.preventDefault();
    if (!branchForm.name.trim() || !branchForm.code.trim()) {
      showToast("Location Name and Unique Code are required.", "error");
      return;
    }

    try {
      if (editingBranch) {
        const res = await api.put(`/branches/${editingBranch._id}`, branchForm);
        if (res.data.success) {
          showToast(res.data.message, "success");
        }
      } else {
        const res = await api.post("/branches", branchForm);
        if (res.data.success) {
          showToast(res.data.message, "success");
        }
      }
      setIsAddBranchModalOpen(false);
      setEditingBranch(null);
      fetchBranches();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
    }
  };

  // Open Edit Branch Modal
  const openEditBranchModal = (b) => {
    setEditingBranch(b);
    setBranchForm({
      name: b.name || "",
      code: b.code || "",
      type: b.type || "store",
      phone: b.phone || "",
      email: b.email || "",
      address: b.address || "",
      city: b.city || "",
      managerName: b.managerName || "",
      isDefault: Boolean(b.isDefault),
      notes: b.notes || ""
    });
    setIsAddBranchModalOpen(true);
  };

  // Open Add Branch Modal
  const openAddBranchModal = () => {
    setEditingBranch(null);
    setBranchForm({
      name: "",
      code: `LOC-${Date.now().toString().slice(-4)}`,
      type: "store",
      phone: "",
      email: "",
      address: "",
      city: "",
      managerName: "",
      isDefault: false,
      notes: ""
    });
    setIsAddBranchModalOpen(true);
  };

  // Safe Delete / Deactivate Branch
  const handleDeleteBranch = async (b) => {
    if (b.isDefault) {
      showToast("Cannot delete the default branch.", "error");
      return;
    }
    if (!window.confirm(`Are you sure you want to remove or deactivate location '${b.name}'?`)) return;

    try {
      const res = await api.delete(`/branches/${b._id}`);
      if (res.data.success) {
        showToast(res.data.message, "success");
        fetchBranches();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
    }
  };

  // Add Item to Transfer Batch
  const addTransferItemRow = () => {
    setTransferItems((prev) => [
      ...prev,
      { productId: "", quantity: 1, unit: "pcs", conversionFactor: 1, maxAvailable: 0 }
    ]);
  };

  // Remove Item from Transfer Batch
  const removeTransferItemRow = (idx) => {
    setTransferItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Update Transfer Item Row
  const updateTransferItemRow = (idx, field, val) => {
    setTransferItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };

      if (field === "productId") {
        const prod = allProducts.find((p) => p._id === val);
        if (prod) {
          updated[idx].unit = prod.unit || "pcs";
          updated[idx].conversionFactor = 1;
          // Find stock at source branch
          const branchStock = branchInventory.find((bi) => bi.productId === val);
          updated[idx].maxAvailable = branchStock ? branchStock.remaining : (prod.remaining || 0);
        }
      }
      return updated;
    });
  };

  // Submit Stock Transfer
  const handleExecuteTransfer = async (e) => {
    e.preventDefault();
    if (!sourceBranchId || !destBranchId) {
      showToast("Please select both source and destination locations.", "error");
      return;
    }
    if (sourceBranchId === destBranchId) {
      showToast("Source and destination cannot be the same location.", "error");
      return;
    }
    const validItems = transferItems.filter((it) => it.productId && it.quantity > 0);
    if (validItems.length === 0) {
      showToast("Please add at least one valid product to transfer.", "error");
      return;
    }

    try {
      setTransferSubmitting(true);
      const res = await api.post("/branches/transfer", {
        sourceBranchId,
        destinationBranchId: destBranchId,
        items: validItems,
        notes: transferNotes
      });

      if (res.data.success) {
        showToast(res.data.message, "success");
        setTransferItems([{ productId: "", quantity: 1, unit: "pcs", conversionFactor: 1, maxAvailable: 0 }]);
        setTransferNotes("");
        fetchBranches();
        fetchTransfers();
        setActiveTab("history");
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
    } finally {
      setTransferSubmitting(false);
    }
  };

  // Open Quick Adjust Modal
  const openQuickAdjustModal = (item) => {
    setAdjustItem(item);
    setAdjustDelta(0);
    setAdjustReason("");
    setIsAdjustModalOpen(true);
  };

  // Submit Quick Stock Adjustment
  const handleSaveStockAdjust = async (e) => {
    e.preventDefault();
    if (!adjustItem || adjustDelta === 0) {
      showToast("Please specify a non-zero adjustment delta.", "error");
      return;
    }

    try {
      setAdjustSubmitting(true);
      const res = await api.post(`/branches/${selectedBranchId}/stock-adjust`, {
        productId: adjustItem.productId,
        delta: adjustDelta,
        reason: adjustReason
      });

      if (res.data.success) {
        showToast(res.data.message, "success");
        setIsAdjustModalOpen(false);
        fetchBranchStock(selectedBranchId);
        fetchBranches();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
    } finally {
      setAdjustSubmitting(false);
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
            <Building2 className="w-7 h-7 text-theme-primary" />
            Stores & Warehouses
          </h1>
          <p className="text-xs text-theme-textMuted mt-0.5">
            Universal multi-store hierarchy, localized inventory tracking, and warehouse transfer network.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={fetchBranches}
            className="px-3.5 py-2 rounded-xl bg-theme-card border border-theme-border text-theme-textSecondary hover:bg-black/5 dark:hover:bg-white/5 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            title="Refresh All"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openAddBranchModal}
            className="px-4 py-2 rounded-xl bg-theme-primary hover:bg-theme-dark text-white text-xs font-extrabold transition flex items-center gap-1.5 shadow-md shadow-theme-primary/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Location
          </button>
        </div>
      </div>

      {/* Top Executive KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
        <StatCard
          title="Retail Stores"
          value={totalStores}
          icon={Store}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-500"
          badgeText="Active Outlets"
          badgeType="success"
          subtitle="Point-of-Sale Billing Locations"
        />

        <StatCard
          title="Warehouses"
          value={totalWarehouses}
          icon={Warehouse}
          iconBg="bg-indigo-500/10"
          iconColor="text-indigo-500"
          badgeText="Depots & Hubs"
          badgeType="info"
          subtitle="Bulk Stock Storage & Distribution"
        />

        <StatCard
          title="Total Stock Units"
          value={totalStockUnits.toLocaleString()}
          icon={Boxes}
          iconBg="bg-emerald-500/10 dark:bg-emerald-950/40"
          iconColor="text-emerald-700 dark:text-emerald-400"
          badgeText="All Locations"
          badgeType="neutral"
          subtitle="Aggregate Multi-Store Inventory"
        />

        <StatCard
          title="Transfers Executed"
          value={transfers.length}
          icon={ArrowRightLeft}
          iconBg="bg-emerald-500/10 dark:bg-emerald-950/40"
          iconColor="text-emerald-700 dark:text-emerald-400"
          badgeText="Audited"
          badgeType="warning"
          subtitle="Inter-Store Movements"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-theme-border pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("branches")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "branches"
              ? "bg-theme-primary text-white shadow-md shadow-theme-primary/20"
              : "bg-theme-card border border-theme-border text-theme-textSecondary hover:bg-black/5 dark:hover:bg-white/5"
          }`}
        >
          <Building2 className="w-4 h-4" />
          Locations Overview ({branches.length})
        </button>

        <button
          onClick={() => setActiveTab("stock")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "stock"
              ? "bg-theme-primary text-white shadow-md shadow-theme-primary/20"
              : "bg-theme-card border border-theme-border text-theme-textSecondary hover:bg-black/5 dark:hover:bg-white/5"
          }`}
        >
          <Boxes className="w-4 h-4" />
          Location Stock Viewer
        </button>

        <button
          onClick={() => setActiveTab("transfer")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "transfer"
              ? "bg-theme-primary text-white shadow-md shadow-theme-primary/20"
              : "bg-theme-card border border-theme-border text-theme-textSecondary hover:bg-black/5 dark:hover:bg-white/5"
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          Stock Transfer Center
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "history"
              ? "bg-theme-primary text-white shadow-md shadow-theme-primary/20"
              : "bg-theme-card border border-theme-border text-theme-textSecondary hover:bg-black/5 dark:hover:bg-white/5"
          }`}
        >
          <History className="w-4 h-4" />
          Transfer Audit History ({transfers.length})
        </button>
      </div>

      {/* TAB 1: STORES & WAREHOUSES OVERVIEW */}
      {activeTab === "branches" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {branches.map((b) => {
            const isWarehouse = b.type === "warehouse";
            return (
              <div
                key={b._id}
                className="bg-theme-card border border-theme-border rounded-lg p-3.5 shadow-2xs hover:border-emerald-500/30 transition duration-200 flex flex-col justify-between relative overflow-hidden group"
              >
                {/* Top Badge Strip */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-md flex items-center justify-center font-bold ${
                          isWarehouse
                            ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {isWarehouse ? <Warehouse className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-sm text-theme-textPrimary group-hover:text-theme-primary transition">
                            {b.name}
                          </h3>
                          {b.isDefault && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
                              HQ / Default
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-theme-textMuted uppercase tracking-wider">
                          Code: {b.code} • {isWarehouse ? "Warehouse" : "Retail Store"}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        b.isActive
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                          : "bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {b.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Contact / Location Meta */}
                  <div className="space-y-1.5 text-xs text-theme-textSecondary my-3 py-2 border-y border-theme-border/60">
                    {b.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-theme-textMuted flex-shrink-0" />
                        <span className="truncate">{b.address}{b.city ? `, ${b.city}` : ""}</span>
                      </div>
                    )}
                    {b.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-theme-textMuted flex-shrink-0" />
                        <span>{b.phone}</span>
                      </div>
                    )}
                    {b.managerName && (
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-theme-textMuted flex-shrink-0" />
                        <span>Manager: <strong>{b.managerName}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Inventory Quick KPI Chips */}
                  <div className="grid grid-cols-2 gap-2 my-3">
                    <div className="bg-black/5 dark:bg-white/5 rounded-xl p-2.5 text-center">
                      <span className="text-[10px] uppercase font-bold text-theme-textMuted block">
                        Tracked SKUs
                      </span>
                      <span className="text-base font-black text-theme-textPrimary">
                        {b.totalSkus || 0}
                      </span>
                    </div>

                    <div className="bg-black/5 dark:bg-white/5 rounded-xl p-2.5 text-center">
                      <span className="text-[10px] uppercase font-bold text-theme-textMuted block">
                        Units in Stock
                      </span>
                      <span className="text-base font-black text-theme-primary">
                        {(b.totalUnits || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-theme-border">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBranchId(b._id);
                      setActiveTab("stock");
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-theme-primary/10 text-theme-primary hover:bg-theme-primary hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    View Stock
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSourceBranchId(b._id);
                      setActiveTab("transfer");
                    }}
                    className="py-1.5 px-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-theme-primary/15 text-theme-textSecondary hover:text-theme-primary text-xs font-bold transition flex items-center justify-center gap-1"
                    title="Transfer Stock from this Location"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditBranchModal(b)}
                    className="py-1.5 px-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-theme-textSecondary text-xs font-bold transition"
                    title="Edit Location Details"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {!b.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleDeleteBranch(b)}
                      className="py-1.5 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-xs font-bold transition"
                      title="Deactivate or Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: LOCATION STOCK VIEWER */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-theme-card border border-theme-border rounded-lg p-4 shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="text-xs font-bold text-theme-textMuted uppercase tracking-wider flex-shrink-0">
                Active Location:
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-theme-border text-xs font-extrabold text-theme-textPrimary focus:ring-2 focus:ring-theme-primary focus:outline-none w-full md:w-64"
              >
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} ({b.type === "warehouse" ? "Warehouse" : "Store"}) {b.isDefault ? "★ Default" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
              {/* Search */}
              <div className="relative flex-1 md:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-theme-textMuted" />
                <input
                  type="text"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  placeholder="Filter stock by name, SKU..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:outline-none"
                />
              </div>

              {/* Low Stock Toggle */}
              <button
                type="button"
                onClick={() => setLowStockFilter(!lowStockFilter)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  lowStockFilter
                    ? "bg-rose-500 text-white shadow-sm"
                    : "bg-theme-card border border-theme-border text-theme-textSecondary hover:bg-black/5"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Low Stock Only
              </button>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-theme-card border border-theme-border rounded-lg shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/5 dark:bg-white/5 text-theme-textMuted uppercase font-bold tracking-wider border-b border-theme-border">
                  <tr>
                    <th className="py-3 px-4">Item & SKU</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Rack / Aisle</th>
                    <th className="py-3 px-3 text-right">Sale Price</th>
                    <th className="py-3 px-4 text-center">Remaining Stock</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {stockLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-theme-textMuted">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-theme-primary" />
                        Loading stock for selected location...
                      </td>
                    </tr>
                  ) : branchInventory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-theme-textMuted">
                        <Boxes className="w-8 h-8 mx-auto mb-2 text-theme-textMuted opacity-40" />
                        No inventory records found for this location.
                      </td>
                    </tr>
                  ) : (
                    branchInventory.map((item) => (
                      <tr key={item._id} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-theme-textPrimary">{item.itemName}</div>
                          <div className="text-[10px] text-theme-textMuted font-mono">
                            SKU: {item.stockID} {item.barcode ? `• Barcode: ${item.barcode}` : ""}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-[11px] font-semibold text-theme-textSecondary">
                            {item.category || "General"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-theme-textSecondary font-mono text-[11px]">
                            {item.rackLocation || "—"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-theme-textPrimary">
                          {currency} {item.salePrice.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-sm">
                          <span
                            className={
                              item.isLowStock
                                ? "text-rose-600 dark:text-rose-400 font-extrabold"
                                : "text-theme-textPrimary"
                            }
                          >
                            {item.remaining} {item.unit || "pcs"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.remaining <= 0 ? (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                              Out of Stock
                            </span>
                          ) : item.isLowStock ? (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                              Low Stock
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              In Stock
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => openQuickAdjustModal(item)}
                            className="px-2.5 py-1 rounded-lg bg-theme-primary/10 text-theme-primary hover:bg-theme-primary hover:text-white text-xs font-bold transition"
                          >
                            Adjust Stock
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

      {/* TAB 3: STOCK TRANSFER CENTER */}
      {activeTab === "transfer" && (
        <form onSubmit={handleExecuteTransfer} className="space-y-6">
          {/* Location Routing Strip */}
          <div className="bg-theme-card border border-theme-border rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm sm:text-base text-theme-textPrimary flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-theme-primary" />
              Transfer Routing
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Source Location */}
              <div className="space-y-1.5 p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-theme-border">
                <label className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                  1. Source Location (Deduct From)
                </label>
                <select
                  value={sourceBranchId}
                  onChange={(e) => setSourceBranchId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-theme-card border border-theme-border text-xs font-semibold text-theme-textPrimary focus:ring-1 focus:ring-theme-primary focus:outline-none"
                >
                  <option value="">Select Origin Branch / Warehouse</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id} disabled={b._id === destBranchId}>
                      {b.name} ({b.type === "warehouse" ? "Warehouse" : "Store"}) {b.isDefault ? "★ HQ" : ""}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-theme-textMuted block">
                  Stock will be safely decremented from this location.
                </span>
              </div>

              {/* Destination Location */}
              <div className="space-y-1.5 p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-theme-border">
                <label className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  2. Destination Location (Receive Into)
                </label>
                <select
                  value={destBranchId}
                  onChange={(e) => setDestBranchId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-theme-card border border-theme-border text-xs font-semibold text-theme-textPrimary focus:ring-1 focus:ring-theme-primary focus:outline-none"
                >
                  <option value="">Select Destination Branch / Warehouse</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id} disabled={b._id === sourceBranchId}>
                      {b.name} ({b.type === "warehouse" ? "Warehouse" : "Store"}) {b.isDefault ? "★ HQ" : ""}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-theme-textMuted block">
                  Stock will be credited to this location upon completion.
                </span>
              </div>
            </div>
          </div>

          {/* Transfer Item Selection Table */}
          <div className="bg-theme-card border border-theme-border rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-theme-textPrimary flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-theme-primary" />
                  Transfer Items Manifest
                </h3>
                <p className="text-xs text-theme-textMuted">
                  Add universal products, select packaging units, and specify transfer quantities.
                </p>
              </div>

              <button
                type="button"
                onClick={addTransferItemRow}
                className="px-3.5 py-1.5 rounded-xl bg-theme-primary/10 text-theme-primary hover:bg-theme-primary hover:text-white text-xs font-extrabold transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item Line
              </button>
            </div>

            <div className="divide-y divide-theme-border">
              {transferItems.map((item, idx) => {
                const selectedProd = allProducts.find((p) => p._id === item.productId);
                return (
                  <div key={idx} className="py-3 grid grid-cols-12 gap-3 items-center">
                    {/* Product Selector */}
                    <div className="col-span-12 sm:col-span-5">
                      <label className="text-[10px] font-bold text-theme-textMuted uppercase mb-1 block">
                        Item {idx + 1}
                      </label>
                      <select
                        value={item.productId}
                        onChange={(e) => updateTransferItemRow(idx, "productId", e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-theme-border font-bold text-theme-textPrimary focus:ring-2 focus:ring-theme-primary focus:outline-none"
                      >
                        <option value="">-- Choose Product --</option>
                        {allProducts.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.itemName} ({p.stockID}) - [{p.remaining} {p.unit || "pcs"} in HQ]
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Packaging Unit */}
                    <div className="col-span-6 sm:col-span-3">
                      <label className="text-[10px] font-bold text-theme-textMuted uppercase mb-1 block">
                        Unit
                      </label>
                      <select
                        value={item.unit}
                        onChange={(e) => {
                          const uName = e.target.value;
                          const pkg = selectedProd?.packagingUnits?.find((u) => u.unitName === uName);
                          updateTransferItemRow(idx, "unit", uName);
                          updateTransferItemRow(idx, "conversionFactor", pkg ? pkg.conversionFactor : 1);
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-theme-border font-bold text-theme-textPrimary focus:ring-2 focus:ring-theme-primary focus:outline-none"
                      >
                        <option value={selectedProd?.unit || "pcs"}>
                          {selectedProd?.unit || "pcs"} (Base 1x)
                        </option>
                        {selectedProd?.packagingUnits?.map((pu, puIdx) => (
                          <option key={puIdx} value={pu.unitName}>
                            {pu.unitName} ({pu.conversionFactor}x)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-4 sm:col-span-3">
                      <label className="text-[10px] font-bold text-theme-textMuted uppercase mb-1 block">
                        Transfer Quantity
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.001"
                        value={item.quantity}
                        onChange={(e) => updateTransferItemRow(idx, "quantity", parseFloat(e.target.value) || 0)}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-theme-border font-bold text-theme-textPrimary focus:ring-2 focus:ring-theme-primary focus:outline-none text-right"
                      />
                    </div>

                    {/* Delete Row Button */}
                    <div className="col-span-2 sm:col-span-1 pt-4 text-center">
                      {transferItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTransferItemRow(idx)}
                          className="p-2 text-slate-400 hover:text-rose-600 transition"
                          title="Remove Line"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Notes & Execution */}
            <div className="pt-4 border-t border-theme-border space-y-4">
              <div>
                <label className="text-xs font-bold text-theme-textMuted uppercase mb-1 block">
                  Transfer Remarks & Reference Notes
                </label>
                <textarea
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. Regular replenishment from Central Warehouse to Downtown Store..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={transferSubmitting}
                  className="px-6 py-3 rounded-lg bg-theme-primary hover:bg-theme-dark text-white font-extrabold text-sm shadow-xl shadow-theme-primary/25 transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <ArrowRightLeft className={`w-4 h-4 ${transferSubmitting ? "animate-spin" : ""}`} />
                  {transferSubmitting ? "Executing Transfer..." : "Complete & Dispatch Stock Transfer"}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 4: TRANSFER AUDIT HISTORY */}
      {activeTab === "history" && (
        <div className="bg-theme-card border border-theme-border rounded-lg shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/5 dark:bg-white/5 text-theme-textMuted uppercase font-bold tracking-wider border-b border-theme-border">
                <tr>
                  <th className="py-3 px-4">Transfer #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Source Location</th>
                  <th className="py-3 px-3">Destination Location</th>
                  <th className="py-3 px-3 text-center">Items</th>
                  <th className="py-3 px-3 text-center">Total Quantity</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4">Initiator / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-theme-textMuted">
                      <History className="w-8 h-8 mx-auto mb-2 text-theme-textMuted opacity-40" />
                      No stock transfer records recorded yet.
                    </td>
                  </tr>
                ) : (
                  transfers.map((tr) => (
                    <tr key={tr._id} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                      <td className="py-3 px-4 font-mono font-black text-theme-primary">
                        {tr.transferNumber}
                      </td>
                      <td className="py-3 px-3 text-theme-textSecondary whitespace-nowrap">
                        {new Date(tr.createdAt).toLocaleDateString()} {new Date(tr.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-3 font-semibold text-rose-600 dark:text-rose-400">
                        {tr.sourceBranchName}
                      </td>
                      <td className="py-3 px-3 font-semibold text-emerald-600 dark:text-emerald-400">
                        {tr.destinationBranchName}
                      </td>
                      <td className="py-3 px-3 text-center font-bold">
                        {tr.totalItems || tr.items?.length || 0}
                      </td>
                      <td className="py-3 px-3 text-center font-black">
                        {tr.totalQuantity}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {tr.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-theme-textMuted">
                        <div>By: <strong>{tr.initiatedBy}</strong></div>
                        {tr.notes && <div className="text-[10px] italic line-clamp-1">{tr.notes}</div>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT LOCATION */}
      <ModalShell
        isOpen={isAddBranchModalOpen}
        onClose={() => setIsAddBranchModalOpen(false)}
        title={editingBranch ? "Edit Location Details" : "Add Store or Warehouse"}
        icon={Building2}
        subtitle="Configure physical store branches, hubs, and inventory warehouses."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveBranch} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-theme-textMuted uppercase mb-1 block">
                Location Name *
              </label>
              <input
                type="text"
                value={branchForm.name}
                onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                required
                placeholder="e.g. Downtown Supermarket"
                className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-theme-textMuted uppercase mb-1 block">
                Unique Code *
              </label>
              <input
                type="text"
                value={branchForm.code}
                onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                required
                placeholder="e.g. STORE-02 or WH-01"
                className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:outline-none font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-theme-textMuted uppercase mb-1 block">
                Location Type
              </label>
              <select
                value={branchForm.type}
                onChange={(e) => setBranchForm({ ...branchForm, type: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:outline-none font-semibold"
              >
                <option value="store">Store / Retail Outlet</option>
                <option value="warehouse">Warehouse / Bulk Depot</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-theme-textMuted uppercase mb-1 block">
                Manager / Contact Person
              </label>
              <input
                type="text"
                value={branchForm.managerName}
                onChange={(e) => setBranchForm({ ...branchForm, managerName: e.target.value })}
                placeholder="Manager Name"
                className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-theme-textMuted uppercase mb-1 block">
                Phone Number
              </label>
              <input
                type="text"
                value={branchForm.phone}
                onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                placeholder="+92 300 1234567"
                className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-theme-textMuted uppercase mb-1 block">
                City / Region
              </label>
              <input
                type="text"
                value={branchForm.city}
                onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                placeholder="City Name"
                className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-theme-textMuted uppercase mb-1 block">
              Physical Street Address
            </label>
            <input
              type="text"
              value={branchForm.address}
              onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
              placeholder="e.g. 14 Commercial Market, Main Boulevard"
              className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="branchIsDefault"
              checked={branchForm.isDefault}
              onChange={(e) => setBranchForm({ ...branchForm, isDefault: e.target.checked })}
              className="w-4 h-4 rounded text-theme-primary focus:ring-theme-primary"
            />
            <label htmlFor="branchIsDefault" className="text-xs font-bold text-theme-textPrimary cursor-pointer">
              Set as Primary / Default Headquarters Store
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-theme-border">
            <button
              type="button"
              onClick={() => setIsAddBranchModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-theme-textSecondary text-xs font-bold hover:bg-black/10 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-theme-primary hover:bg-theme-dark text-white text-xs font-extrabold shadow-md transition"
            >
              {editingBranch ? "Update Location" : "Save Location"}
            </button>
          </div>
        </form>
      </ModalShell>

      {/* MODAL: QUICK STOCK ADJUSTMENT */}
      <ModalShell
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Adjust Location Inventory"
        icon={Boxes}
        subtitle={adjustItem ? `${adjustItem.itemName} (${adjustItem.stockID})` : "Stock Adjustment"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveStockAdjust} className="space-y-4">
          <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 text-xs flex justify-between items-center">
            <span className="text-theme-textMuted font-bold">Current Stock at this Location:</span>
            <span className="text-base font-black text-theme-primary">
              {adjustItem?.remaining || 0} {adjustItem?.unit || "pcs"}
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-theme-textMuted uppercase mb-1 block">
              Adjustment Quantity Delta (+ for addition, - for removal) *
            </label>
            <input
              type="number"
              step="any"
              value={adjustDelta}
              onChange={(e) => setAdjustDelta(parseFloat(e.target.value) || 0)}
              required
              placeholder="e.g. 10 or -5"
              className="w-full px-3 py-2 text-sm font-black bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:outline-none"
            />
            <span className="text-[10px] text-theme-textMuted mt-1 block">
              New Projected Stock: <strong>{Math.max(0, (adjustItem?.remaining || 0) + adjustDelta)}</strong>
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-theme-textMuted uppercase mb-1 block">
              Reason / Audit Justification *
            </label>
            <input
              type="text"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              required
              placeholder="e.g. Received local supplier delivery, damaged stock removal..."
              className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-theme-border">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-theme-textSecondary text-xs font-bold hover:bg-black/10 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adjustSubmitting}
              className="px-5 py-2 rounded-xl bg-theme-primary hover:bg-theme-dark text-white text-xs font-extrabold shadow-md transition disabled:opacity-50"
            >
              {adjustSubmitting ? "Applying..." : "Save Adjustment"}
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}

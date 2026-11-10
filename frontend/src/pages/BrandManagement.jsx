import React, { useState, useEffect, useMemo } from "react";
import {
  Bookmark,
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Globe,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Layers,
  RefreshCw
} from "lucide-react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import ConfirmModal from "../components/ConfirmModal";

export default function BrandManagement() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";

  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
  const [editingBrand, setEditingBrand] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [brandForm, setBrandForm] = useState({
    name: "",
    originCountry: "Pakistan",
    description: "",
    isActive: true
  });

  // Delete State
  const [brandToDelete, setBrandToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch Brands
  const fetchBrands = async () => {
    try {
      setLoading(true);
      const res = await api.get("/brands");
      if (res.data.success) {
        setBrands(res.data.brands || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load brands", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  // Filtered Brands
  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return brands;
    const q = searchQuery.toLowerCase();
    return brands.filter(
      (b) =>
        b.name?.toLowerCase().includes(q) ||
        b.originCountry?.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q)
    );
  }, [brands, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = brands.length;
    const active = brands.filter((b) => b.isActive !== false).length;
    const totalProductsLinked = brands.reduce((sum, b) => sum + (b.productCount || 0), 0);
    const sorted = [...brands].sort((a, b) => (b.productCount || 0) - (a.productCount || 0));
    const topBrand = sorted.length > 0 && sorted[0].productCount > 0 ? sorted[0] : null;

    return { total, active, totalProductsLinked, topBrand };
  }, [brands]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setModalMode("add");
    setEditingBrand(null);
    setBrandForm({
      name: "",
      originCountry: "Pakistan",
      description: "",
      isActive: true
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (b) => {
    setModalMode("edit");
    setEditingBrand(b);
    setBrandForm({
      name: b.name || "",
      originCountry: b.originCountry || "Pakistan",
      description: b.description || "",
      isActive: b.isActive !== false
    });
    setIsModalOpen(true);
  };

  // Submit Add / Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!brandForm.name.trim()) {
      showToast("Brand name is required", "error");
      return;
    }

    try {
      setSubmitting(true);
      if (modalMode === "add") {
        const res = await api.post("/brands", brandForm);
        if (res.data.success) {
          showToast(res.data.message || "Brand created successfully!", "success");
          setIsModalOpen(false);
          fetchBrands();
        }
      } else {
        const res = await api.put(`/brands/${editingBrand._id}`, brandForm);
        if (res.data.success) {
          showToast(res.data.message || "Brand updated successfully!", "success");
          setIsModalOpen(false);
          fetchBrands();
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save brand", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!brandToDelete) return;
    try {
      setDeleteLoading(true);
      const res = await api.delete(`/brands/${brandToDelete._id}`);
      if (res.data.success) {
        showToast(res.data.message || "Brand deleted successfully", "success");
        setBrandToDelete(null);
        fetchBrands();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Cannot delete brand", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-theme-textPrimary">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-theme-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Bookmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Brand Management</h1>
            <p className="text-xs sm:text-sm text-theme-textMuted font-medium">
              Manage product brands, track registered manufacturers, and maintain inventory associations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchBrands}
            disabled={loading}
            className="p-2.5 rounded-xl border border-theme-border hover:bg-black/5 dark:hover:bg-white/5 text-theme-textMuted transition"
            title="Refresh Brands"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {isAdminOrManager && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-theme-primary hover:bg-theme-primaryHover text-white font-bold text-sm shadow-md transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Brand</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-theme-card border border-theme-border rounded-lg p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-theme-textMuted">Total Brands</span>
            <Bookmark className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black mt-2">{stats.total}</div>
          <div className="text-[11px] text-theme-textMuted mt-1">Registered manufacturers</div>
        </div>

        <div className="bg-theme-card border border-theme-border rounded-lg p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-theme-textMuted">Active Brands</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black mt-2 text-emerald-600 dark:text-emerald-400">{stats.active}</div>
          <div className="text-[11px] text-theme-textMuted mt-1">Ready for catalog assignment</div>
        </div>

        <div className="bg-theme-card border border-theme-border rounded-lg p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-theme-textMuted">Linked Products</span>
            <Package className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl font-black mt-2 text-indigo-600 dark:text-indigo-400">
            {stats.totalProductsLinked}
          </div>
          <div className="text-[11px] text-theme-textMuted mt-1">Total items in catalog</div>
        </div>

        <div className="bg-theme-card border border-theme-border rounded-lg p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-theme-textMuted">Top Brand</span>
            <Layers className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-lg font-black mt-2 truncate">
            {stats.topBrand ? stats.topBrand.name : "N/A"}
          </div>
          <div className="text-[11px] text-theme-textMuted mt-1 truncate">
            {stats.topBrand ? `${stats.topBrand.productCount} product(s) linked` : "No products assigned"}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-theme-card border border-theme-border rounded-lg p-3 shadow-card flex items-center gap-3">
        <Search className="w-4 h-4 text-theme-textMuted ml-1 flex-shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search brands by name, origin country, or description..."
          className="bg-transparent w-full text-sm font-medium focus:outline-none placeholder:text-theme-textMuted"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-xs font-semibold px-2 py-1 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* Brands Table */}
      <div className="bg-theme-card border border-theme-border rounded-lg shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/5 dark:bg-white/5 border-b border-theme-border text-xs uppercase font-extrabold text-theme-textMuted">
              <tr>
                <th className="py-3.5 px-4">Brand Name</th>
                <th className="py-3.5 px-4">Origin Country</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4 text-center">Catalog Products</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                {isAdminOrManager && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-theme-textMuted">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-theme-primary" />
                      <span>Loading brands...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBrands.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-theme-textMuted">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Bookmark className="w-8 h-8 mx-auto text-theme-textMuted opacity-40" />
                      <p className="font-semibold">No brands found</p>
                      <p className="text-xs text-theme-textMuted">
                        {searchQuery ? "Try refining your search query." : "Click '+ Add Brand' to create your first brand."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBrands.map((b) => (
                  <tr key={b._id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
                    <td className="py-3.5 px-4 font-bold text-theme-textPrimary flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">
                        {b.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{b.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-theme-textSecondary">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <Globe className="w-3.5 h-3.5 text-theme-textMuted" />
                        {b.originCountry || "Pakistan"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-theme-textMuted text-xs max-w-xs truncate">
                      {b.description || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          b.productCount > 0
                            ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                            : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                        }`}
                      >
                        <Package className="w-3 h-3" />
                        {b.productCount || 0} items
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {b.isActive !== false ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    {isAdminOrManager && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(b)}
                            className="p-1.5 rounded-lg border border-theme-border hover:bg-black/5 dark:hover:bg-white/5 text-theme-textMuted hover:text-theme-primary transition"
                            title="Edit Brand"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setBrandToDelete(b)}
                            className={`p-1.5 rounded-lg border border-theme-border hover:bg-rose-500/10 text-theme-textMuted hover:text-rose-600 transition ${
                              b.productCount > 0 ? "opacity-60 cursor-pointer" : ""
                            }`}
                            title={
                              b.productCount > 0
                                ? `Cannot delete: ${b.productCount} product(s) linked`
                                : "Delete Brand"
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-lg shadow-2xl max-w-md w-full p-6 text-theme-textPrimary space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <div className="flex items-center gap-2 font-bold text-base">
                <Bookmark className="w-5 h-5 text-theme-primary" />
                <span>{modalMode === "add" ? "Add New Brand" : "Edit Brand"}</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-theme-textMuted hover:text-theme-textPrimary p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-theme-textMuted uppercase text-[11px] mb-1">
                  Brand Name *
                </label>
                <input
                  type="text"
                  required
                  value={brandForm.name}
                  onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                  placeholder="e.g. Nestlé, National Foods, Unilever"
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-theme-border focus:ring-2 focus:ring-theme-primary focus:outline-none text-sm font-bold text-theme-textPrimary"
                />
              </div>

              <div>
                <label className="block text-theme-textMuted uppercase text-[11px] mb-1">
                  Country of Origin
                </label>
                <input
                  type="text"
                  value={brandForm.originCountry}
                  onChange={(e) => setBrandForm({ ...brandForm, originCountry: e.target.value })}
                  placeholder="e.g. Pakistan, USA, Switzerland"
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-theme-border focus:ring-2 focus:ring-theme-primary focus:outline-none text-xs font-semibold text-theme-textPrimary"
                />
              </div>

              <div>
                <label className="block text-theme-textMuted uppercase text-[11px] mb-1">
                  Description / Notes
                </label>
                <textarea
                  rows={2}
                  value={brandForm.description}
                  onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                  placeholder="Short note about manufacturer or product category..."
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-theme-border focus:ring-2 focus:ring-theme-primary focus:outline-none text-xs font-medium text-theme-textPrimary"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="brandActive"
                  checked={brandForm.isActive}
                  onChange={(e) => setBrandForm({ ...brandForm, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-theme-primary focus:ring-theme-primary cursor-pointer"
                />
                <label htmlFor="brandActive" className="text-xs font-bold cursor-pointer text-theme-textPrimary">
                  Active Brand (Available in Product Forms)
                </label>
              </div>

              {modalMode === "edit" && editingBrand?.productCount > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Changing this brand name will automatically update all <strong>{editingBrand.productCount}</strong> linked product(s).
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl border border-theme-border hover:bg-black/5 dark:hover:bg-white/5 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-theme-primary hover:bg-theme-primaryHover text-white font-bold shadow-md transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : modalMode === "add" ? "Create Brand" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {brandToDelete && (
        <ConfirmModal
          isOpen={Boolean(brandToDelete)}
          onClose={() => setBrandToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Brand"
          message={
            brandToDelete.productCount > 0 ? (
              <div className="space-y-2">
                <p className="font-bold text-rose-500">
                  Cannot delete brand '{brandToDelete.name}'!
                </p>
                <p className="text-xs">
                  There are currently <strong>{brandToDelete.productCount}</strong> products in your catalog assigned to this brand.
                  You must reassign or remove those products before this brand can be deleted.
                </p>
              </div>
            ) : (
              `Are you sure you want to delete brand '${brandToDelete.name}'? This action cannot be undone.`
            )
          }
          confirmText={brandToDelete.productCount > 0 ? "Understood" : "Delete Brand"}
          confirmColor={brandToDelete.productCount > 0 ? "bg-slate-700 hover:bg-slate-800" : "bg-rose-600 hover:bg-rose-700"}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}

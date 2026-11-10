import React, { useState, useEffect, useMemo } from "react";
import {
  FolderTree,
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Palette,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Coffee,
  Apple,
  Utensils,
  Layers,
  HeartPulse,
  Tag
} from "lucide-react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import ConfirmModal from "../components/ConfirmModal";

const PRESET_COLORS = [
  "#0d9488", // Teal
  "#2563eb", // Blue
  "#7c3aed", // Violet
  "#db2777", // Pink
  "#ea580c", // Orange
  "#16a34a", // Green
  "#d97706", // Amber
  "#dc2626", // Red
  "#475569"  // Slate
];

const PRESET_ICONS = [
  { name: "ShoppingBag", label: "Shopping Bag", icon: ShoppingBag },
  { name: "Sparkles", label: "Sparkles / Household", icon: Sparkles },
  { name: "Coffee", label: "Beverages / Coffee", icon: Coffee },
  { name: "Apple", label: "Grocery / Fresh", icon: Apple },
  { name: "Utensils", label: "Food / Kitchen", icon: Utensils },
  { name: "HeartPulse", label: "Health / Beauty", icon: HeartPulse },
  { name: "Layers", label: "General / Other", icon: Layers }
];

export default function CategoryManagement() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
  const [editingCategory, setEditingCategory] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    color: "#0d9488",
    icon: "ShoppingBag",
    isActive: true
  });

  // Delete State
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get("/categories");
      if (res.data.success) {
        setCategories(res.data.categories || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load categories", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Filtered Categories
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.isActive !== false).length;
    const totalProductsLinked = categories.reduce((sum, c) => sum + (c.productCount || 0), 0);
    const sorted = [...categories].sort((a, b) => (b.productCount || 0) - (a.productCount || 0));
    const topCategory = sorted.length > 0 && sorted[0].productCount > 0 ? sorted[0] : null;

    return { total, active, totalProductsLinked, topCategory };
  }, [categories]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setModalMode("add");
    setEditingCategory(null);
    setCategoryForm({
      name: "",
      description: "",
      color: "#0d9488",
      icon: "ShoppingBag",
      isActive: true
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (c) => {
    setModalMode("edit");
    setEditingCategory(c);
    setCategoryForm({
      name: c.name || "",
      description: c.description || "",
      color: c.color || "#0d9488",
      icon: c.icon || "ShoppingBag",
      isActive: c.isActive !== false
    });
    setIsModalOpen(true);
  };

  // Submit Add / Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      showToast("Category name is required", "error");
      return;
    }

    try {
      setSubmitting(true);
      if (modalMode === "add") {
        const res = await api.post("/categories", categoryForm);
        if (res.data.success) {
          showToast(res.data.message || "Category created successfully!", "success");
          setIsModalOpen(false);
          fetchCategories();
        }
      } else {
        const res = await api.put(`/categories/${editingCategory._id}`, categoryForm);
        if (res.data.success) {
          showToast(res.data.message || "Category updated successfully!", "success");
          setIsModalOpen(false);
          fetchCategories();
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save category", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    try {
      setDeleteLoading(true);
      const res = await api.delete(`/categories/${categoryToDelete._id}`);
      if (res.data.success) {
        showToast(res.data.message || "Category deleted successfully", "success");
        setCategoryToDelete(null);
        fetchCategories();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Cannot delete category", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-theme-textPrimary">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-theme-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-btn bg-theme-iconBg text-theme-iconColor border border-theme-border flex items-center justify-center">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Category Management</h1>
            <p className="text-xs sm:text-sm text-theme-textMuted font-medium">
              Manage product departments, POS picture grid categories, and inventory groupings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCategories}
            disabled={loading}
            className="p-2.5 rounded-btn border border-theme-border hover:bg-black/5 dark:hover:bg-white/5 text-theme-textMuted transition"
            title="Refresh Categories"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {isAdminOrManager && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-btn bg-[#14532D] hover:bg-[#104323] text-white font-bold text-sm shadow-card transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-theme-card border border-theme-border rounded-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-theme-textMuted">Total Categories</span>
            <FolderTree className="w-5 h-5 text-theme-primary" />
          </div>
          <div className="text-2xl font-black mt-2">{stats.total}</div>
          <div className="text-[11px] text-theme-textMuted mt-1">Supermarket departments</div>
        </div>

        <div className="bg-theme-card border border-theme-border rounded-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-theme-textMuted">Active Categories</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black mt-2 text-emerald-600 dark:text-emerald-400">{stats.active}</div>
          <div className="text-[11px] text-theme-textMuted mt-1">Visible on POS Terminal</div>
        </div>

        <div className="bg-theme-card border border-theme-border rounded-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-theme-textMuted">Categorized Products</span>
            <Package className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black mt-2 text-emerald-600 dark:text-emerald-400">
            {stats.totalProductsLinked}
          </div>
          <div className="text-[11px] text-theme-textMuted mt-1">Total items classified</div>
        </div>

        <div className="bg-theme-card border border-theme-border rounded-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-theme-textMuted">Top Category</span>
            <Layers className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-lg font-black mt-2 truncate">
            {stats.topCategory ? stats.topCategory.name : "N/A"}
          </div>
          <div className="text-[11px] text-theme-textMuted mt-1 truncate">
            {stats.topCategory ? `${stats.topCategory.productCount} product(s) linked` : "No products assigned"}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-theme-card border border-theme-border rounded-card p-3 shadow-card flex items-center gap-3">
        <Search className="w-4 h-4 text-theme-textMuted ml-1 flex-shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search categories by name or description..."
          className="bg-transparent w-full text-sm font-medium focus:outline-none placeholder:text-theme-placeholder"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-xs font-semibold px-2 py-1 rounded-btn bg-black/5 dark:bg-white/10 hover:bg-black/10 transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* Categories Table */}
      <div className="bg-theme-card border border-theme-border rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-theme-tableHeader border-b border-theme-border text-xs uppercase font-extrabold text-theme-textMuted">
              <tr>
                <th className="py-3.5 px-4">Category Name</th>
                <th className="py-3.5 px-4">Color & Badge</th>
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
                      <span>Loading categories...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-theme-textMuted">
                    <div className="max-w-sm mx-auto space-y-2">
                      <FolderTree className="w-8 h-8 mx-auto text-theme-textMuted opacity-40" />
                      <p className="font-semibold">No categories found</p>
                      <p className="text-xs text-theme-textMuted">
                        {searchQuery ? "Try refining your search query." : "Click '+ Add Category' to create your first category."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((c) => (
                  <tr key={c._id} className="hover:bg-theme-tableHover transition">
                    <td className="py-3.5 px-4 font-bold text-theme-textPrimary flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-btn flex items-center justify-center text-white font-extrabold text-xs shadow-xs"
                        style={{ backgroundColor: c.color || "#0d9488" }}
                      >
                        <Tag className="w-4 h-4" />
                      </div>
                      <span>{c.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-theme-textSecondary">
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-badge bg-black/5 dark:bg-white/5 border border-theme-border text-xs font-mono font-bold">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: c.color || "#0d9488" }}
                        />
                        <span>{c.color || "#0d9488"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-theme-textMuted text-xs max-w-xs truncate">
                      {c.description || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-badge text-xs font-bold ${
                          c.productCount > 0
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                        }`}
                      >
                        <Package className="w-3 h-3" />
                        {c.productCount || 0} items
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {c.isActive !== false ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-badge">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-badge">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    {isAdminOrManager && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 rounded-btn border border-theme-border hover:bg-black/5 dark:hover:bg-white/5 text-theme-textMuted hover:text-theme-primary transition"
                            title="Edit Category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setCategoryToDelete(c)}
                            className={`p-1.5 rounded-btn border border-theme-border hover:bg-rose-500/10 text-theme-textMuted hover:text-rose-600 transition ${
                              c.productCount > 0 ? "opacity-60 cursor-pointer" : ""
                            }`}
                            title={
                              c.productCount > 0
                                ? `Cannot delete: ${c.productCount} product(s) linked`
                                : "Delete Category"
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
          <div className="bg-theme-card border border-theme-border rounded-card shadow-2xl max-w-md w-full p-6 text-theme-textPrimary space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <div className="flex items-center gap-2 font-bold text-base">
                <FolderTree className="w-5 h-5 text-theme-primary" />
                <span>{modalMode === "add" ? "Add New Category" : "Edit Category"}</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-theme-textMuted hover:text-theme-textPrimary p-1 rounded-btn"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-theme-textMuted uppercase text-[11px] mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g. Beverages, Dairy, Grocery, Snacks"
                  className="w-full px-3 py-2 rounded-input bg-theme-inputBg border border-theme-inputBorder focus:ring-1 focus:ring-theme-primary focus:outline-none text-sm font-bold text-theme-textPrimary placeholder:text-theme-placeholder"
                />
              </div>

              <div>
                <label className="block text-theme-textMuted uppercase text-[11px] mb-1">
                  Description / Department Notes
                </label>
                <textarea
                  rows={2}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Short note about items in this department..."
                  className="w-full px-3 py-2 rounded-input bg-theme-inputBg border border-theme-inputBorder focus:ring-1 focus:ring-theme-primary focus:outline-none text-xs font-medium text-theme-textPrimary placeholder:text-theme-placeholder"
                />
              </div>

              {/* Color Swatch Picker */}
              <div>
                <label className="block text-theme-textMuted uppercase text-[11px] mb-1.5 flex items-center justify-between">
                  <span>Badge Accent Color</span>
                  <span className="font-mono">{categoryForm.color}</span>
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, color: hex })}
                      className={`w-7 h-7 rounded-btn transition transform hover:scale-110 flex items-center justify-center ${
                        categoryForm.color === hex ? "ring-2 ring-offset-2 ring-theme-primary scale-110" : ""
                      }`}
                      style={{ backgroundColor: hex }}
                    >
                      {categoryForm.color === hex && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="w-7 h-7 rounded-btn border-0 cursor-pointer p-0 bg-transparent"
                    title="Custom color"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="categoryActive"
                  checked={categoryForm.isActive}
                  onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-theme-primary focus:ring-theme-primary cursor-pointer"
                />
                <label htmlFor="categoryActive" className="text-xs font-bold cursor-pointer text-theme-textPrimary">
                  Active Category (Show on POS Terminal Grid & Forms)
                </label>
              </div>

              {modalMode === "edit" && editingCategory?.productCount > 0 && (
                <div className="p-3 rounded-btn bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Changing this category name will automatically update all <strong>{editingCategory.productCount}</strong> linked product(s).
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-btn border border-theme-border hover:bg-black/5 dark:hover:bg-white/5 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-btn bg-[#14532D] hover:bg-[#104323] text-white font-bold shadow-card transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : modalMode === "add" ? "Create Category" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {categoryToDelete && (
        <ConfirmModal
          isOpen={Boolean(categoryToDelete)}
          onClose={() => setCategoryToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Category"
          message={
            categoryToDelete.productCount > 0 ? (
              <div className="space-y-2">
                <p className="font-bold text-rose-500">
                  Cannot delete category '{categoryToDelete.name}'!
                </p>
                <p className="text-xs">
                  There are currently <strong>{categoryToDelete.productCount}</strong> products in your catalog assigned to this category.
                  You must reassign or remove those products before this category can be deleted.
                </p>
              </div>
            ) : (
              `Are you sure you want to delete category '${categoryToDelete.name}'? This action cannot be undone.`
            )
          }
          confirmText={categoryToDelete.productCount > 0 ? "Understood" : "Delete Category"}
          confirmColor={categoryToDelete.productCount > 0 ? "bg-slate-700 hover:bg-slate-800" : "bg-rose-600 hover:bg-rose-700"}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}

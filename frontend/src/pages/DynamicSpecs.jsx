import React, { useState, useEffect } from "react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ConfirmModal from "../components/ConfirmModal";
import {
  Layers,
  Plus,
  Trash2,
  Search,
  Tag,
  Palette,
  Package,
  CheckCircle,
  X,
  RefreshCw,
  FolderPlus,
  ChevronRight
} from "lucide-react";

export default function DynamicSpecs() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [definitions, setDefinitions] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState(null);

  // Add Brand/Item Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    brandName: "",
    itemsText: "", // comma or newline separated
    units: ["pcs", "kg", "g", "ltr", "pack", "box", "tin"],
    colors: [] // [{ colour: "", code: "" }]
  });
  const [newColorName, setNewColorName] = useState("");
  const [newColorCode, setNewColorCode] = useState("#1e293b");

  // Add Item to existing brand modal
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addItemData, setAddItemData] = useState({
    brandName: "",
    itemsText: "",
    colors: []
  });

  // Confirm delete modal state
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    message: "",
    action: null
  });

  const fetchDefinitions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/dynamic/all");
      if (res.data.success) {
        setDefinitions(res.data.allDefinitions || []);
        if (res.data.allDefinitions?.length > 0 && !selectedBrand) {
          setSelectedBrand(res.data.allDefinitions[0]);
        } else if (selectedBrand) {
          const updated = res.data.allDefinitions.find(
            (b) => b._id === selectedBrand._id
          );
          setSelectedBrand(updated || res.data.allDefinitions[0] || null);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load specifications", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefinitions();
  }, []);

  const handleAddBrandSubmit = async (e) => {
    e.preventDefault();
    if (!formData.brandName.trim()) {
      showToast("Please enter a brand or category name.", "error");
      return;
    }

    const itemsList = formData.itemsText
      .split(/[\n,]+/)
      .map((i) => i.trim())
      .filter(Boolean);

    try {
      const res = await api.post("/dynamic/add-item", {
        brandName: formData.brandName.trim(),
        itemsList: itemsList.length > 0 ? itemsList : ["General Item"],
        units: formData.units,
        colors: formData.colors
      });

      if (res.data.success) {
        showToast(res.data.message || "Brand specification saved!", "success");
        setShowAddModal(false);
        setFormData({
          brandName: "",
          itemsText: "",
          units: ["pcs", "kg", "g", "ltr", "pack", "box", "tin"],
          colors: []
        });
        await fetchDefinitions();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save specification", "error");
    }
  };

  const handleAddItemToBrandSubmit = async (e) => {
    e.preventDefault();
    if (!addItemData.itemsText.trim()) {
      showToast("Please enter at least one item name.", "error");
      return;
    }

    const itemsList = addItemData.itemsText
      .split(/[\n,]+/)
      .map((i) => i.trim())
      .filter(Boolean);

    try {
      const res = await api.post("/dynamic/add-item", {
        brandName: addItemData.brandName,
        itemsList,
        colors: addItemData.colors
      });

      if (res.data.success) {
        showToast("New item(s) added successfully!", "success");
        setShowAddItemModal(false);
        setAddItemData({ brandName: "", itemsText: "", colors: [] });
        await fetchDefinitions();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to add items", "error");
    }
  };

  const handleDeleteBrand = (brand) => {
    setConfirmModal({
      open: true,
      title: "Delete Brand Definition",
      message: `Are you sure you want to permanently delete "${brand.brandName}" and all associated item specifications?`,
      action: async () => {
        try {
          const res = await api.post("/dynamic/delete-brand", { brandId: brand._id });
          if (res.data.success) {
            showToast(res.data.message, "success");
            setSelectedBrand(null);
            await fetchDefinitions();
          }
        } catch (err) {
          showToast(err.response?.data?.message || "Failed to delete brand", "error");
        }
      }
    });
  };

  const handleDeleteItem = (brandId, productId, itemName) => {
    setConfirmModal({
      open: true,
      title: "Delete Item Specification",
      message: `Delete "${itemName}" from this brand?`,
      action: async () => {
        try {
          const res = await api.post("/dynamic/delete-product", { brandId, productId });
          if (res.data.success) {
            showToast(res.data.message, "success");
            await fetchDefinitions();
          }
        } catch (err) {
          showToast(err.response?.data?.message || "Failed to delete item", "error");
        }
      }
    });
  };

  const handleDeleteColor = (brandId, productId, colorId, colorName) => {
    setConfirmModal({
      open: true,
      title: "Remove Color Variant",
      message: `Remove color "${colorName}"?`,
      action: async () => {
        try {
          const res = await api.post("/dynamic/delete-color", { brandId, productId, colorId });
          if (res.data.success) {
            showToast(res.data.message, "success");
            await fetchDefinitions();
          }
        } catch (err) {
          showToast(err.response?.data?.message || "Failed to remove color", "error");
        }
      }
    });
  };

  const addColorToForm = () => {
    if (!newColorName.trim()) return;
    setFormData((prev) => ({
      ...prev,
      colors: [...prev.colors, { colour: newColorName.trim(), code: newColorCode }]
    }));
    setNewColorName("");
    setNewColorCode("#1e293b");
  };

  const removeColorFromForm = (index) => {
    setFormData((prev) => ({
      ...prev,
      colors: prev.colors.filter((_, i) => i !== index)
    }));
  };

  const filteredDefinitions = definitions.filter((d) =>
    d.brandName.toLowerCase().includes(search.toLowerCase()) ||
    d.products?.some((p) => p.itemName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <Layers className="text-teal-600" size={26} />
            Dynamic Item Specifications & Brands
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Define dynamic brands, products, color shades, and standard measurement units for retail & inventory.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDefinitions}
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm transition"
          >
            <FolderPlus size={18} />
            New Brand / Category
          </button>
        </div>
      </div>

      {/* Main Content: Left Column (Brands List) & Right Column (Brand Details & Items) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Brand / Category Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search brands or items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1 mb-2">
              Brands & Categories ({filteredDefinitions.length})
            </div>

            {loading ? (
              <LoadingSkeleton type="card" count={4} />
            ) : filteredDefinitions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No specifications found. Click "+ New Brand" to create one.
              </div>
            ) : (
              <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
                {filteredDefinitions.map((brand) => {
                  const isSelected = selectedBrand?._id === brand._id;
                  const totalItems = brand.products?.length || 0;
                  const totalColors = brand.products?.reduce(
                    (acc, p) => acc + (p.colors?.length || 0),
                    0
                  );

                  return (
                    <div
                      key={brand._id}
                      onClick={() => setSelectedBrand(brand)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between group ${
                        isSelected
                          ? "bg-teal-50/80 border-teal-500 shadow-sm"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <h4
                          className={`font-semibold text-sm truncate ${
                            isSelected ? "text-teal-900" : "text-slate-800"
                          }`}
                        >
                          {brand.brandName}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Package size={12} /> {totalItems} items
                          </span>
                          {totalColors > 0 && (
                            <span className="flex items-center gap-1">
                              <Palette size={12} /> {totalColors} shades
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <ChevronRight
                          size={18}
                          className={`transition ${
                            isSelected ? "text-teal-600" : "text-slate-400 group-hover:translate-x-0.5"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Selected Brand Spec Details */}
        <div className="lg:col-span-8">
          {selectedBrand ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Brand Header */}
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 to-white">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-800">
                      {selectedBrand.brandName}
                    </h2>
                    <span className="px-2.5 py-0.5 text-xs font-semibold bg-teal-100 text-teal-800 rounded-full">
                      {selectedBrand.products?.length || 0} Products
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-xs text-slate-400 font-medium mr-1">Units:</span>
                    {(selectedBrand.units || ["pcs", "kg", "g", "ltr", "pack", "box", "tin"]).map(
                      (u) => (
                        <span
                          key={u}
                          className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-md border border-slate-200 font-mono"
                        >
                          {u}
                        </span>
                      )
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => {
                      setAddItemData({
                        brandName: selectedBrand.brandName,
                        itemsText: "",
                        colors: []
                      });
                      setShowAddItemModal(true);
                    }}
                    className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
                  >
                    <Plus size={15} /> Add Products
                  </button>
                  <button
                    onClick={() => handleDeleteBrand(selectedBrand)}
                    className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium px-3 py-2 rounded-lg transition"
                    title="Delete Brand"
                  >
                    <Trash2 size={15} /> Delete Brand
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
                  Registered Products & Variants
                </h3>

                {selectedBrand.products?.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    No products added to {selectedBrand.brandName} yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedBrand.products?.map((prod) => (
                      <div
                        key={prod._id}
                        className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
                              <Tag size={16} />
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-800 text-sm">
                                {prod.itemName}
                              </h4>
                              <p className="text-xs text-slate-500">
                                {prod.colors?.length > 0
                                  ? `${prod.colors.length} color/shade variants`
                                  : "Standard single variant"}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              handleDeleteItem(selectedBrand._id, prod._id, prod.itemName)
                            }
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remove Product"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Colors Chips */}
                        {prod.colors?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200/70 flex flex-wrap gap-2">
                            {prod.colors.map((c) => (
                              <span
                                key={c._id || c.colour}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-slate-200 shadow-2xs group"
                              >
                                {c.code && (
                                  <span
                                    className="w-3 h-3 rounded-full border border-slate-300 inline-block shadow-inner"
                                    style={{ backgroundColor: c.code }}
                                  />
                                )}
                                <span className="text-slate-700">{c.colour}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteColor(
                                      selectedBrand._id,
                                      prod._id,
                                      c._id,
                                      c.colour
                                    )
                                  }
                                  className="text-slate-300 hover:text-red-500 ml-0.5 transition"
                                  title="Remove shade"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 shadow-sm">
              <Layers size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-slate-600">Select a brand from the left list</p>
              <p className="text-xs text-slate-400 mt-1">
                You can view its products, shades, and manage dynamic specifications.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Add New Brand / Category */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FolderPlus className="text-teal-600" size={20} />
                Create New Brand / Category
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddBrandSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Brand / Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Berger Paints, Nestlé, Unilever, Philips..."
                  value={formData.brandName}
                  onChange={(e) =>
                    setFormData({ ...formData, brandName: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Products / Items List (Comma or Line Separated)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Weather Coat, Matt Enamel, Primer (or Milk 1L, Butter 200g, Bread)"
                  value={formData.itemsText}
                  onChange={(e) =>
                    setFormData({ ...formData, itemsText: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Color Shades (Optional) */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Optional Color / Variant Shades
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Color / Shade name (e.g. Off White, Ash Grey)"
                    value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <input
                    type="color"
                    value={newColorCode}
                    onChange={(e) => setNewColorCode(e.target.value)}
                    className="w-8 h-8 p-0.5 border border-slate-300 rounded-lg cursor-pointer bg-white"
                    title="Pick swatch color"
                  />
                  <button
                    type="button"
                    onClick={addColorToForm}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg transition"
                  >
                    Add Shade
                  </button>
                </div>

                {formData.colors.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.colors.map((c, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-slate-200"
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-slate-300"
                          style={{ backgroundColor: c.code }}
                        />
                        <span>{c.colour}</span>
                        <button
                          type="button"
                          onClick={() => removeColorFromForm(idx)}
                          className="text-slate-400 hover:text-red-500 ml-1"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
                >
                  Save Specification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Items to Selected Brand */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Plus className="text-teal-600" size={20} />
                Add Products to {addItemData.brandName}
              </h3>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddItemToBrandSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Product / Item Names * (Comma or Line Separated)
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Wall Putty, Gloss Finish, Red Oxide"
                  value={addItemData.itemsText}
                  onChange={(e) =>
                    setAddItemData({ ...addItemData, itemsText: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
                >
                  Add to Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ ...confirmModal, open: false })}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Confirm"
        danger={true}
      />
    </div>
  );
}

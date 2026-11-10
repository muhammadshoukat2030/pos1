import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Boxes,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  Edit2,
  Trash2,
  Upload,
  Download,
  Barcode,
  Printer,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  Undo2,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  Bookmark
} from "lucide-react";
import api from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { TableSkeleton } from "../components/LoadingSkeleton";
import ConfirmModal from "../components/ConfirmModal";

const UNIVERSAL_UNITS = [
  { value: "pcs", label: "Piece / pcs", isDecimal: false },
  { value: "pack", label: "Pack", isDecimal: false },
  { value: "box", label: "Box", isDecimal: false },
  { value: "carton", label: "Carton", isDecimal: false },
  { value: "kg", label: "Kilogram (kg)", isDecimal: true },
  { value: "g", label: "Gram (g)", isDecimal: true },
  { value: "L", label: "Liter (L)", isDecimal: true },
  { value: "ml", label: "Milliliter (ml)", isDecimal: true },
  { value: "bottle", label: "Bottle", isDecimal: false },
  { value: "dozen", label: "Dozen", isDecimal: false }
];

export default function ProductsInventory() {
  const { storeSettings } = useTheme();
  const { showToast } = useToast();
  const currency = storeSettings?.currency || "PKR";
  const [searchParams] = useSearchParams();

  // Data states
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  // Filter states
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get("tab") === "stock");
  const [expiringSoonOnly, setExpiringSoonOnly] = useState(false);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);

  // Stock Adjustment Modal
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [adjustmentType, setAdjustmentType] = useState("Restock / Addition");
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustReason, setAdjustReason] = useState("");

  // Company Refund Modal
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(searchParams.get("tab") === "company-refund");
  const [refundProduct, setRefundProduct] = useState(null);
  const [refundQty, setRefundQty] = useState(1);
  const [refundReason, setRefundReason] = useState("");

  // Form Fields for Add / Edit Product
  const [formName, setFormName] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formBrand, setFormBrand] = useState("General");
  const [formCategory, setFormCategory] = useState("General");
  const [formUnit, setFormUnit] = useState("pcs");
  const [formDecimal, setFormDecimal] = useState(false);
  const [formCostPrice, setFormCostPrice] = useState(0);
  const [formSalePrice, setFormSalePrice] = useState(0);
  const [formWholesalePrice, setFormWholesalePrice] = useState(0);
  const [formMinSellingPrice, setFormMinSellingPrice] = useState(0);
  const [formTaxRate, setFormTaxRate] = useState(0);
  const [formDescription, setFormDescription] = useState("");
  const [formPackagingUnits, setFormPackagingUnits] = useState([]);
  const [formTotalProduct, setFormTotalProduct] = useState(10);
  const [formMinAlert, setFormMinAlert] = useState(5);
  const [formExpiryDate, setFormExpiryDate] = useState("");
  const [formImageFile, setFormImageFile] = useState(null);
  const [formImagePreview, setFormImagePreview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Barcode Label Generator State
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [barcodeCount, setBarcodeCount] = useState(8);

  // CSV Import State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvImporting, setCsvImporting] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProductsCount, setTotalProductsCount] = useState(0);

  const fetchProducts = async (pageOverride) => {
    try {
      setLoading(true);
      const targetPage = pageOverride !== undefined ? pageOverride : currentPage;
      const res = await api.get("/products", {
        params: {
          search,
          category: selectedCategory,
          stockStatus: stockFilter,
          lowStock: lowStockOnly ? "true" : undefined,
          expiringSoon: expiringSoonOnly ? "true" : undefined,
          page: targetPage,
          limit: pageSize
        }
      });
      if (res.data.success) {
        setProducts(res.data.products || []);
        setCategories(res.data.categories || []);
        setBrands(res.data.brands || []);
        setStats(res.data.stats || {});
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalProductsCount(res.data.pagination.totalProducts || 0);
          setCurrentPage(res.data.pagination.page || 1);
        } else {
          setTotalProductsCount(res.data.products?.length || 0);
        }
      }
    } catch (err) {
      showToast("Error loading products: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchProducts(1);
  }, [selectedCategory, stockFilter, lowStockOnly, expiringSoonOnly, pageSize]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchProducts(1);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
      fetchProducts(page);
    }
  };

  const addPackagingUnit = () => {
    setFormPackagingUnits([
      ...formPackagingUnits,
      { unitName: "", conversionFactor: 1, salePrice: formSalePrice || 0, costPrice: formCostPrice || 0, barcode: "" }
    ]);
  };

  const updatePackagingUnit = (index, field, value) => {
    const updated = [...formPackagingUnits];
    updated[index][field] = value;
    setFormPackagingUnits(updated);
  };

  const removePackagingUnit = (index) => {
    setFormPackagingUnits(formPackagingUnits.filter((_, idx) => idx !== index));
  };

  const openAddProductModal = () => {
    setEditingProduct(null);
    setFormName("");
    setFormBarcode("");
    setFormSku("");
    const firstBrand = brands[0] ? (typeof brands[0] === "string" ? brands[0] : brands[0].name) : "";
    const firstCat = categories[0] ? (typeof categories[0] === "string" ? categories[0] : categories[0].name) : "";
    setFormBrand(firstBrand);
    setFormCategory(firstCat);
    setFormUnit("pcs");
    setFormDecimal(false);
    setFormCostPrice(0);
    setFormSalePrice(0);
    setFormWholesalePrice(0);
    setFormMinSellingPrice(0);
    setFormTaxRate(0);
    setFormDescription("");
    setFormPackagingUnits([]);
    setFormTotalProduct(10);
    setFormMinAlert(5);
    setFormExpiryDate("");
    setFormImageFile(null);
    setFormImagePreview("");
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (p) => {
    setEditingProduct(p);
    setFormName(p.itemName);
    setFormBarcode(p.barcode || p.stockID || "");
    setFormSku(p.sku || "");
    setFormBrand(p.brandName || "");
    setFormCategory(p.category || "");
    setFormUnit(p.unit || "pcs");
    setFormDecimal(p.allowDecimal || false);
    setFormCostPrice(p.costPrice || 0);
    setFormSalePrice(p.salePrice || p.rate || 0);
    setFormWholesalePrice(p.wholesalePrice || 0);
    setFormMinSellingPrice(p.minSellingPrice || 0);
    setFormTaxRate(p.taxRate || 0);
    setFormDescription(p.description || "");
    setFormPackagingUnits(p.packagingUnits || []);
    setFormTotalProduct(p.totalProduct || 0);
    setFormMinAlert(p.minStockAlert || 5);
    setFormExpiryDate(p.expiryDate ? p.expiryDate.split("T")[0] : "");
    setFormImageFile(null);
    setFormImagePreview(p.image || "");
    setIsProductModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
      if (!validTypes.includes(file.type)) {
        showToast("Invalid image type. Please select a JPG, PNG, WEBP, or SVG file.", "error");
        e.target.value = "";
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast("Image file size must be less than 5 MB.", "error");
        e.target.value = "";
        return;
      }
      setFormImageFile(file);
      setFormImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast("Product name is required.", "error");
      return;
    }
    if (!formBrand || formBrand.trim() === "") {
      showToast("Please select a brand from the dropdown.", "error");
      return;
    }
    if (!formCategory || formCategory.trim() === "") {
      showToast("Please select a category from the dropdown.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("itemName", formName.trim());
      formData.append("barcode", formBarcode.trim());
      formData.append("sku", formSku.trim());
      formData.append("brandName", formBrand.trim());
      formData.append("category", formCategory.trim());
      formData.append("unit", formUnit.trim());
      formData.append("allowDecimal", formDecimal);
      formData.append("costPrice", formCostPrice);
      formData.append("salePrice", formSalePrice);
      formData.append("rate", formSalePrice);
      formData.append("wholesalePrice", formWholesalePrice);
      formData.append("minSellingPrice", formMinSellingPrice);
      formData.append("taxRate", formTaxRate);
      formData.append("description", formDescription);
      formData.append("packagingUnits", JSON.stringify(formPackagingUnits));
      formData.append("totalProduct", formTotalProduct);
      formData.append("minStockAlert", formMinAlert);
      if (formExpiryDate) formData.append("expiryDate", formExpiryDate);
      if (formImageFile) formData.append("productImage", formImageFile);

      let res;
      if (editingProduct) {
        res = await api.put(`/products/${editingProduct._id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        res = await api.post("/products", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      if (res.data.success) {
        showToast(editingProduct ? "Product updated successfully!" : "Product created successfully!", "success");
        setIsProductModalOpen(false);
        fetchProducts();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to save product", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      const res = await api.delete(`/products/${productToDelete._id}`);
      if (res.data.success) {
        showToast("Product deleted successfully.", "success");
        setProducts((prev) => prev.filter((p) => p._id !== productToDelete._id));
        setProductToDelete(null);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
    }
  };

  // Stock Adjustment
  const handleStockAdjustmentSubmit = async (e) => {
    e.preventDefault();
    if (!stockProduct) {
      showToast("Please select a product to adjust.", "error");
      return;
    }
    const qty = parseFloat(adjustQty);
    if (isNaN(qty) || (adjustmentType !== "Audit Correction" && qty <= 0)) {
      showToast("Please enter a valid quantity.", "error");
      return;
    }

    const currentStock = parseFloat(stockProduct.remaining) || 0;
    if (adjustmentType === "Damaged / Expired" && qty > currentStock) {
      showToast(`Cannot deduct ${qty} items. Only ${currentStock} in stock!`, "error");
      return;
    }

    try {
      const res = await api.post("/products/adjust-stock", {
        productId: stockProduct._id,
        adjustmentType,
        changeQuantity: qty,
        newTotalQuantity: adjustmentType === "Audit Correction" ? qty : undefined,
        reason: adjustReason
      });

      if (res.data.success) {
        showToast(res.data.message || "Stock adjusted successfully!", "success");
        setIsStockModalOpen(false);
        setAdjustReason("");
        setAdjustQty(1);
        fetchProducts();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Adjustment failed", "error");
    }
  };

  // Company Refund
  const handleCompanyRefundSubmit = async (e) => {
    e.preventDefault();
    if (!refundProduct || refundQty <= 0) return;

    try {
      const res = await api.post("/products/company-refund", {
        stockID: refundProduct.stockID,
        refundQuantity: refundQty,
        reason: refundReason
      });

      if (res.data.success) {
        showToast(res.data.message || "Refund to supplier recorded!", "success");
        setIsRefundModalOpen(false);
        fetchProducts();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Supplier refund failed", "error");
    }
  };

  // CSV Export
  const handleExportCsv = async () => {
    try {
      showToast("Generating CSV...", "info");
      const res = await api.get("/products/export-csv", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `inventory-export-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showToast("Inventory CSV exported successfully!", "success");
    } catch (err) {
      showToast("Failed to export CSV: " + err.message, "error");
    }
  };

  // Download Sample CSV
  const handleDownloadSampleCsv = async () => {
    try {
      const res = await api.get("/products/sample-csv", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "sample-inventory-template.csv");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      showToast("Failed to download template: " + err.message, "error");
    }
  };

  // CSV File reader
  const handleCsvFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setCsvText(evt.target.result);
    };
    reader.readAsText(file);
  };

  // CSV Import Submit
  const handleImportCsvSubmit = async (e) => {
    e.preventDefault();
    if (!csvText.trim()) {
      showToast("Please choose a CSV file or paste CSV content.", "error");
      return;
    }
    try {
      setCsvImporting(true);
      const res = await api.post("/products/import-csv", { csvData: csvText });
      if (res.data.success) {
        showToast(res.data.message, "success");
        setIsCsvModalOpen(false);
        setCsvText("");
        fetchProducts();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
    } finally {
      setCsvImporting(false);
    }
  };

  const openBarcodeGenerator = (prod = null) => {
    setBarcodeProduct(prod || products[0] || null);
    setIsBarcodeModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-theme-textPrimary flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-theme-primary" /> Products & Inventory Management
          </h1>
          <p className="text-xs text-theme-textSecondary mt-0.5">
            Super Mart stock tracking, barcode management, and multi-unit pricing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-theme-border bg-theme-card hover:bg-black/5 dark:hover:bg-white/5 text-theme-textPrimary font-bold text-xs shadow-2xs transition"
            title="Download full inventory CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
          </button>

          {/* Import CSV */}
          <button
            type="button"
            onClick={() => setIsCsvModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-theme-border bg-theme-card hover:bg-black/5 dark:hover:bg-white/5 text-theme-textPrimary font-bold text-xs shadow-2xs transition"
            title="Bulk import products from CSV"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" /> Import CSV
          </button>

          {/* Barcode Stickers */}
          <button
            type="button"
            onClick={() => openBarcodeGenerator()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-theme-border bg-theme-card hover:bg-black/5 dark:hover:bg-white/5 text-theme-textPrimary font-bold text-xs shadow-2xs transition"
            title="Generate printable Code128 barcode labels"
          >
            <Barcode className="w-3.5 h-3.5 text-theme-primary" /> Barcode Stickers
          </button>

          <button
            type="button"
            onClick={() => {
              setStockProduct(products[0] || null);
              setAdjustQty(1);
              setAdjustReason("");
              setIsStockModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 font-bold text-xs hover:bg-emerald-100 transition"
            title="Adjust inventory stock count"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Adjust Stock
          </button>

          <button
            onClick={() => {
              setRefundProduct(products[0] || null);
              setIsRefundModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 text-rose-600 font-bold text-xs hover:bg-rose-100 transition"
          >
            <Undo2 className="w-3.5 h-3.5" /> Company Refund
          </button>

          <button
            onClick={openAddProductModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-theme-primary hover:bg-theme-dark text-white font-bold text-xs shadow-md transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-theme-card border border-theme-border rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-theme-textMuted uppercase">Total Catalog</span>
          <h3 className="text-xl font-black text-theme-textPrimary mt-0.5">
            {stats.totalProductsCount || products.length} Items
          </h3>
        </div>

        <div className="bg-theme-card border border-theme-border rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-theme-textMuted uppercase">Stock on Hand</span>
          <h3 className="text-xl font-black text-theme-textPrimary mt-0.5">
            {stats.totalRemaining || 0} Units
          </h3>
        </div>

        <div className="bg-theme-card border border-theme-border rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-theme-textMuted uppercase">Inventory Value</span>
          <h3 className="text-xl font-black text-emerald-600 mt-0.5">
            {currency} {(stats.remainingValue || 0).toLocaleString()}
          </h3>
        </div>

        <div className="bg-theme-card border border-theme-border rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-theme-textMuted uppercase">Low Stock Alerts</span>
          <h3 className="text-xl font-black text-amber-500 mt-0.5">
            {products.filter((p) => p.remaining <= (p.minStockAlert || 5)).length} Alerts
          </h3>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-theme-card border border-theme-border rounded-2xl p-4 shadow-card flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Category & Status Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-semibold focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((c, idx) => (
              <option key={idx} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-semibold focus:outline-none"
          >
            <option value="all">All Stock Status</option>
            <option value="in">In Stock Only</option>
            <option value="out">Out of Stock</option>
          </select>

          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition ${
              lowStockOnly
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-black/5 dark:bg-white/5 text-theme-textSecondary hover:text-theme-textPrimary"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-72">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-theme-textMuted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search barcode or name..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl focus:outline-none focus:ring-2 focus:ring-theme-primary"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 rounded-xl bg-theme-primary text-white font-bold text-xs shadow-sm"
          >
            Search
          </button>
        </form>
      </div>

      {/* Products Table */}
      {loading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : products.length === 0 ? (
        <div className="bg-theme-card border border-theme-border rounded-2xl p-12 text-center text-xs text-theme-textMuted">
          <Boxes className="w-10 h-10 mx-auto mb-2 text-theme-textMuted opacity-40" />
          No products found. Click "+ Add Product" to create your first inventory item.
        </div>
      ) : (
        <div className="bg-theme-card border border-theme-border rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/5 dark:bg-white/5 text-[11px] font-bold text-theme-textMuted uppercase border-b border-theme-border">
                <tr>
                  <th className="p-3 w-12 text-center">Img</th>
                  <th className="p-3">Product Name / Barcode</th>
                  <th className="p-3">Category & Brand</th>
                  <th className="p-3 text-right">Cost Price</th>
                  <th className="p-3 text-right">Sale Price</th>
                  <th className="p-3 text-center">Remaining Stock</th>
                  <th className="p-3 text-center w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {products.map((p) => {
                  const isLow = p.remaining <= (p.minStockAlert || 5);
                  return (
                    <tr key={p._id} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                      {/* Image */}
                      <td className="p-2 text-center">
                        <div className="w-10 h-10 rounded-lg bg-black/5 dark:bg-white/5 overflow-hidden flex items-center justify-center mx-auto">
                          <img
                            src={p.image || "/images/product-placeholder.svg"}
                            alt={p.itemName}
                            className="w-full h-full object-contain p-0.5"
                            onError={(e) => {
                              e.target.src = "/images/product-placeholder.svg";
                            }}
                          />
                        </div>
                      </td>

                      {/* Name & Barcode */}
                      <td className="p-3">
                        <div className="font-bold text-sm text-theme-textPrimary">{p.itemName}</div>
                        <div className="text-[11px] text-theme-textMuted font-mono">
                          {p.barcode || p.stockID} {p.sku && `• SKU: ${p.sku}`}
                        </div>
                      </td>

                      {/* Category & Brand */}
                      <td className="p-3">
                        <span className="font-semibold text-theme-textPrimary block">{p.category}</span>
                        <span className="text-[11px] text-theme-textMuted">{p.brandName || "General"}</span>
                      </td>

                      {/* Cost Price */}
                      <td className="p-3 text-right font-medium text-theme-textSecondary">
                        {currency} {(p.costPrice || 0).toLocaleString()}
                      </td>

                      {/* Sale Price & Packaging Units */}
                      <td className="p-3 text-right">
                        <div className="font-black text-theme-textPrimary">
                          {currency} {(p.salePrice || p.rate || 0).toLocaleString()}
                        </div>
                        {p.packagingUnits && p.packagingUnits.length > 0 && (
                          <div className="text-[10px] text-theme-primary font-semibold mt-0.5">
                            +{p.packagingUnits.length} pkg {p.packagingUnits.length === 1 ? "unit" : "units"}
                          </div>
                        )}
                      </td>

                      {/* Remaining Stock */}
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isLow
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                            }`}
                          >
                            {p.remaining} {p.unit || "pcs"}
                          </span>
                          {isLow && (
                            <span title="Low Stock Warning">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setStockProduct(p);
                              setAdjustQty(1);
                              setIsStockModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 transition"
                            title="Adjust Stock"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openBarcodeGenerator(p)}
                            className="p-1.5 rounded-lg border border-theme-border hover:bg-theme-primary/10 text-theme-primary transition"
                            title="Generate Barcode Sticker Labels"
                          >
                            <Barcode className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditProductModal(p)}
                            className="p-1.5 rounded-lg border border-theme-border hover:bg-black/5 dark:hover:bg-white/5 text-theme-textSecondary transition"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setProductToDelete(p)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Toolbar */}
          <div className="px-5 py-3.5 border-t border-theme-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-theme-bg/30">
            <div className="flex items-center gap-3 text-theme-textSecondary">
              <span>
                Showing <strong className="text-theme-textPrimary">{totalProductsCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{" "}
                <strong className="text-theme-textPrimary">{Math.min(currentPage * pageSize, totalProductsCount)}</strong> of{" "}
                <strong className="text-theme-textPrimary">{totalProductsCount}</strong> products
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-slate-400">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-theme-card border border-theme-border rounded-lg px-2 py-1 text-xs font-semibold text-theme-textPrimary focus:outline-none"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-theme-border bg-theme-card hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none font-semibold transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>

              <div className="px-3 py-1 font-bold text-theme-textPrimary">
                Page {currentPage} of {totalPages}
              </div>

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-theme-border bg-theme-card hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none font-semibold transition"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODAL: ADD / EDIT PRODUCT */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <h3 className="font-extrabold text-base text-theme-textPrimary flex items-center gap-2">
                <Boxes className="w-5 h-5 text-theme-primary" />
                {editingProduct ? "Edit Product" : "Add New Product"}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-theme-textMuted hover:text-theme-textPrimary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              {/* Product Name */}
              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Olpers Milk 1 Litre"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-medium focus:ring-2 focus:ring-theme-primary focus:outline-none"
                />
              </div>

              {/* Barcode & SKU */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-theme-textSecondary block mb-1">Barcode</label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="Scan or leave blank to auto-generate"
                    className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-theme-textSecondary block mb-1">SKU Code</label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="e.g. SKU-1002"
                    className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Category & Brand Selection from DB */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-theme-textSecondary block">Category *</label>
                    <Link
                      to="/categories"
                      target="_blank"
                      className="text-[10px] text-theme-primary hover:underline font-bold inline-flex items-center gap-0.5"
                    >
                      <FolderTree className="w-3 h-3" /> Manage
                    </Link>
                  </div>
                  {categories.length === 0 ? (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-center justify-between">
                      <span>No categories</span>
                      <Link to="/categories" className="font-bold underline text-theme-primary ml-1">
                        + Add First
                      </Link>
                    </div>
                  ) : (
                    <select
                      required
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-bold text-theme-textPrimary focus:ring-2 focus:ring-theme-primary"
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map((c) => {
                        const name = typeof c === "string" ? c : c.name;
                        return (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-theme-textSecondary block">Brand *</label>
                    <Link
                      to="/brands"
                      target="_blank"
                      className="text-[10px] text-theme-primary hover:underline font-bold inline-flex items-center gap-0.5"
                    >
                      <Bookmark className="w-3 h-3" /> Manage
                    </Link>
                  </div>
                  {brands.length === 0 ? (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-center justify-between">
                      <span>No brands</span>
                      <Link to="/brands" className="font-bold underline text-theme-primary ml-1">
                        + Add First
                      </Link>
                    </div>
                  ) : (
                    <select
                      required
                      value={formBrand}
                      onChange={(e) => setFormBrand(e.target.value)}
                      className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-bold text-theme-textPrimary focus:ring-2 focus:ring-theme-primary"
                    >
                      <option value="">-- Select Brand --</option>
                      {brands.map((b) => {
                        const name = typeof b === "string" ? b : b.name;
                        return (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              </div>

              {/* Universal Units & Allow Decimal */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="font-bold text-theme-textSecondary block mb-1">Unit of Measure *</label>
                  <select
                    value={formUnit}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      setFormUnit(selectedVal);
                      const unitObj = UNIVERSAL_UNITS.find(
                        (u) => u.value.toLowerCase() === selectedVal.toLowerCase()
                      );
                      if (unitObj?.isDecimal) {
                        setFormDecimal(true);
                      }
                    }}
                    className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-bold text-theme-textPrimary focus:ring-2 focus:ring-theme-primary"
                  >
                    {UNIVERSAL_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pt-4">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-theme-textSecondary">
                    <input
                      type="checkbox"
                      checked={formDecimal}
                      onChange={(e) => setFormDecimal(e.target.checked)}
                      className="w-4 h-4 rounded text-theme-primary focus:ring-theme-primary"
                    />
                    <span>Allow Decimal Qty (e.g. 0.5 kg, 1.25 L)</span>
                  </label>
                </div>
              </div>

              {/* Cost Price & Sale Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-theme-textSecondary block mb-1">Purchase / Cost Price ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-theme-textSecondary block mb-1">Retail Sale Price ({currency}) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formSalePrice}
                    onChange={(e) => setFormSalePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-bold text-emerald-600"
                  />
                </div>
              </div>

              {/* Wholesale Price, Min Selling Price Floor & Tax Rate */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-theme-textSecondary block mb-1">Wholesale Price ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    value={formWholesalePrice}
                    onChange={(e) => setFormWholesalePrice(parseFloat(e.target.value) || 0)}
                    placeholder="B2B rate"
                    className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-theme-textSecondary block mb-1">Min Price Floor ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    value={formMinSellingPrice}
                    onChange={(e) => setFormMinSellingPrice(parseFloat(e.target.value) || 0)}
                    placeholder="Min allowed"
                    className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-theme-textSecondary block mb-1">Tax / GST (%)</label>
                  <input
                    type="number"
                    step="any"
                    value={formTaxRate}
                    onChange={(e) => setFormTaxRate(parseFloat(e.target.value) || 0)}
                    placeholder="0%"
                    className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Multi-Unit Packaging / Bulk Conversions Section */}
              <div className="border border-theme-border rounded-2xl p-3.5 bg-black/5 dark:bg-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-theme-textPrimary block">Multi-Unit Packaging & Conversions</span>
                    <span className="text-[11px] text-theme-textMuted">
                      Sell in Cartons, Boxes, Packs, or Strips that deduct from base {formUnit} stock automatically
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addPackagingUnit}
                    className="px-2.5 py-1 rounded-lg bg-theme-primary text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Unit
                  </button>
                </div>

                {formPackagingUnits.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {formPackagingUnits.map((u, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-theme-card border border-theme-border p-2.5 rounded-xl">
                        <div className="col-span-3">
                          <label className="text-[10px] font-bold text-theme-textMuted block">Packaging Unit</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Carton, Box"
                            value={u.unitName}
                            onChange={(e) => updatePackagingUnit(idx, "unitName", e.target.value)}
                            className="w-full px-2 py-1 bg-black/5 dark:bg-white/5 border border-theme-border rounded-lg font-bold"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="text-[10px] font-bold text-theme-textMuted block">1 Unit = (Base {formUnit})</label>
                          <input
                            type="number"
                            step="any"
                            required
                            min="0.001"
                            placeholder="e.g. 12"
                            value={u.conversionFactor}
                            onChange={(e) => updatePackagingUnit(idx, "conversionFactor", parseFloat(e.target.value) || 1)}
                            className="w-full px-2 py-1 bg-black/5 dark:bg-white/5 border border-theme-border rounded-lg font-bold"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="text-[10px] font-bold text-theme-textMuted block">Sale Price ({currency})</label>
                          <input
                            type="number"
                            step="any"
                            required
                            placeholder="Carton Price"
                            value={u.salePrice}
                            onChange={(e) => updatePackagingUnit(idx, "salePrice", parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-black/5 dark:bg-white/5 border border-theme-border rounded-lg font-bold text-emerald-600"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] font-bold text-theme-textMuted block">Barcode</label>
                          <input
                            type="text"
                            placeholder="Optional"
                            value={u.barcode || ""}
                            onChange={(e) => updatePackagingUnit(idx, "barcode", e.target.value)}
                            className="w-full px-2 py-1 bg-black/5 dark:bg-white/5 border border-theme-border rounded-lg font-mono text-[11px]"
                          />
                        </div>
                        <div className="col-span-1 text-center pt-3">
                          <button
                            type="button"
                            onClick={() => removePackagingUnit(idx)}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                            title="Remove unit"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Initial Stock & Low Stock Alert */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-theme-textSecondary block mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    step="any"
                    value={formTotalProduct}
                    onChange={(e) => setFormTotalProduct(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-theme-textSecondary block mb-1">Min Stock Alert Level</label>
                  <input
                    type="number"
                    value={formMinAlert}
                    onChange={(e) => setFormMinAlert(parseInt(e.target.value) || 5)}
                    className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={formExpiryDate}
                  onChange={(e) => setFormExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl"
                />
              </div>

              {/* Product Description */}
              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Description / Product Notes</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Additional details, size, specifications..."
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-medium focus:ring-2 focus:ring-theme-primary focus:outline-none"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">
                  Product Picture (JPG, PNG, WEBP, max 5MB)
                </label>
                <div className="flex items-center gap-3">
                  {formImagePreview ? (
                    <div className="relative group">
                      <img
                        src={formImagePreview}
                        alt="Preview"
                        className="w-14 h-14 rounded-xl object-contain border border-theme-border bg-black/5"
                        onError={(e) => {
                          e.target.src = "/images/product-placeholder.svg";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormImageFile(null);
                          setFormImagePreview("");
                        }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shadow"
                        title="Remove Image"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl border border-dashed border-theme-border flex items-center justify-center text-theme-textMuted bg-black/5">
                      <ImageIcon className="w-6 h-6 opacity-40" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    onChange={handleImageChange}
                    className="text-xs text-theme-textSecondary file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-theme-primary/10 file:text-theme-primary hover:file:bg-theme-primary/20 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-theme-border hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-theme-primary hover:bg-theme-dark text-white font-bold shadow-md"
                >
                  {submitting ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. MODAL: STOCK ADJUSTMENT */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <h3 className="font-bold text-base text-theme-textPrimary flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-600" /> Stock Adjustment
              </h3>
              <button
                onClick={() => setIsStockModalOpen(false)}
                className="p-1 rounded-lg text-theme-textMuted hover:text-theme-textPrimary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockAdjustmentSubmit} className="space-y-3.5 text-xs">
              {/* Product Selection */}
              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">
                  Select Product *
                </label>
                <select
                  value={stockProduct?._id || ""}
                  onChange={(e) => {
                    const found = products.find((p) => p._id === e.target.value);
                    setStockProduct(found || null);
                  }}
                  required
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-bold text-theme-textPrimary focus:ring-2 focus:ring-theme-primary"
                >
                  <option value="">-- Choose Product to Adjust --</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.itemName} ({p.remaining} {p.unit || "pcs"} in stock) - [{p.barcode || p.stockID}]
                    </option>
                  ))}
                </select>
              </div>

              {stockProduct && (
                <>
                  <div>
                    <label className="font-bold text-theme-textSecondary block mb-1">
                      Adjustment Action *
                    </label>
                    <select
                      value={adjustmentType}
                      onChange={(e) => setAdjustmentType(e.target.value)}
                      className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-bold text-theme-textPrimary"
                    >
                      <option value="Restock / Addition">+ Restock / Add Stock (Increase)</option>
                      <option value="Damaged / Expired">- Damaged / Expired / Loss (Decrease)</option>
                      <option value="Audit Correction">= Set Physical Audit Count (Audit Override)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-theme-textSecondary block mb-1">
                      {adjustmentType === "Audit Correction" ? "Physical Count In Hand *" : "Quantity to Adjust *"}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min={adjustmentType === "Audit Correction" ? "0" : "0.001"}
                      required
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-bold text-base"
                    />
                  </div>

                  {/* Live Stock Comparison Card */}
                  {(() => {
                    const current = parseFloat(stockProduct.remaining) || 0;
                    const val = parseFloat(adjustQty) || 0;
                    let resulting = current;
                    let change = 0;
                    if (adjustmentType === "Restock / Addition") {
                      resulting = current + val;
                      change = val;
                    } else if (adjustmentType === "Damaged / Expired") {
                      resulting = current - val;
                      change = -val;
                    } else if (adjustmentType === "Audit Correction") {
                      resulting = val;
                      change = val - current;
                    }
                    const isNeg = resulting < 0;

                    return (
                      <div
                        className={`p-3 rounded-xl border ${
                          isNeg
                            ? "bg-rose-500/10 border-rose-500/20 text-rose-600"
                            : "bg-black/5 dark:bg-white/5 border-theme-border"
                        } space-y-1.5`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-theme-textMuted">Current Stock:</span>
                          <span className="font-mono">
                            {current} {stockProduct.unit || "pcs"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-theme-textMuted">Stock Change:</span>
                          <span
                            className={`font-mono font-bold ${
                              change > 0
                                ? "text-emerald-600"
                                : change < 0
                                ? "text-rose-500"
                                : ""
                            }`}
                          >
                            {change > 0 ? `+${change}` : change} {stockProduct.unit || "pcs"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold pt-1.5 border-t border-theme-border">
                          <span>Resulting Stock:</span>
                          <span
                            className={`font-mono text-sm ${
                              isNeg ? "text-rose-600" : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {resulting} {stockProduct.unit || "pcs"}
                          </span>
                        </div>
                        {isNeg && (
                          <div className="text-[11px] text-rose-500 font-bold pt-1">
                            ⚠️ Resulting stock cannot be negative. Please adjust quantity.
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div>
                    <label className="font-bold text-theme-textSecondary block mb-1">
                      Reason / Notes *
                    </label>
                    <input
                      type="text"
                      required
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      placeholder="e.g. Received supplier shipment, broken jar, stock audit"
                      className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-medium"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-theme-border hover:bg-black/5 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    !stockProduct ||
                    (adjustmentType === "Damaged / Expired" && adjustQty > (stockProduct.remaining || 0))
                  }
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition"
                >
                  Apply Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL: COMPANY / SUPPLIER REFUND */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <h3 className="font-bold text-base text-rose-600 flex items-center gap-2">
                <Undo2 className="w-5 h-5" /> Company / Supplier Refund
              </h3>
              <button onClick={() => setIsRefundModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompanyRefundSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Select Product</label>
                <select
                  value={refundProduct?.stockID || ""}
                  onChange={(e) => {
                    const found = products.find((p) => p.stockID === e.target.value);
                    setRefundProduct(found || null);
                  }}
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-medium"
                >
                  {products.map((p) => (
                    <option key={p._id} value={p.stockID}>
                      {p.itemName} ({p.remaining} {p.unit} in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Refund Quantity</label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  max={refundProduct?.remaining || 100}
                  value={refundQty}
                  onChange={(e) => setRefundQty(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Reason for Return</label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Expired stock or damaged packaging"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-theme-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Return to Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: BARCODE STICKER & PRICE TAG GENERATOR */}
      {isBarcodeModalOpen && barcodeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-2xl p-5 max-w-3xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <h3 className="font-bold text-base text-theme-textPrimary flex items-center gap-2">
                <Barcode className="w-5 h-5 text-theme-primary" /> Barcode Sticker & Price Tag Generator
              </h3>
              <button onClick={() => setIsBarcodeModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Controls Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-black/5 dark:bg-white/5 rounded-xl text-xs">
              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Select Product</label>
                <select
                  value={barcodeProduct._id}
                  onChange={(e) => {
                    const found = products.find((p) => p._id === e.target.value);
                    if (found) setBarcodeProduct(found);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-black/30 border border-theme-border rounded-lg font-bold"
                >
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.itemName} ({p.barcode || p.stockID})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Stickers Count</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={barcodeCount}
                  onChange={(e) => setBarcodeCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-black/30 border border-theme-border rounded-lg font-bold text-center"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full py-2 px-3 rounded-xl bg-theme-primary hover:bg-theme-dark text-white font-bold flex items-center justify-center gap-1.5 shadow-md transition"
                >
                  <Printer className="w-4 h-4" /> Print Sticker Sheet
                </button>
              </div>
            </div>

            {/* Printable Sticker Sheet Preview */}
            <div>
              <div className="text-xs font-bold text-theme-textMuted uppercase mb-2">
                Print Preview ({barcodeCount} Labels - 50x30mm Standard Size):
              </div>

              <div
                id="printable-barcode-sheet"
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 p-4 bg-white text-black border border-dashed border-gray-300 rounded-xl"
              >
                {Array.from({ length: barcodeCount }).map((_, idx) => (
                  <div
                    key={idx}
                    className="border border-black/80 rounded-md p-2 text-center bg-white flex flex-col justify-between h-[120px] shadow-2xs font-mono"
                  >
                    <div className="text-[9px] font-black uppercase tracking-tight truncate text-gray-800">
                      {storeSettings?.storeName || "Universal Mart"}
                    </div>

                    <div className="text-[10px] font-bold line-clamp-1 leading-tight text-black">
                      {barcodeProduct.itemName}
                    </div>

                    {/* Barcode Strip Pattern */}
                    <div className="my-0.5">
                      <div className="tracking-[4px] text-xs font-black select-none text-black">
                        ||| | |||| | ||||| || | ||
                      </div>
                      <div className="text-[8px] font-bold tracking-wider text-gray-700">
                        *{barcodeProduct.barcode || barcodeProduct.stockID}*
                      </div>
                    </div>

                    {/* Price & Unit */}
                    <div className="text-xs font-black text-black border-t border-dotted border-gray-400 pt-0.5 flex justify-between items-center px-1">
                      <span className="text-[8px] text-gray-600 uppercase font-sans">Price:</span>
                      <span>
                        {currency} {(barcodeProduct.salePrice || barcodeProduct.rate || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-theme-border">
              <button
                type="button"
                onClick={() => setIsBarcodeModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-theme-border font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: BULK CSV IMPORT */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <h3 className="font-bold text-base text-theme-textPrimary flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Bulk CSV Inventory Import
              </h3>
              <button onClick={() => setIsCsvModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportCsvSubmit} className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-emerald-900 dark:text-emerald-300 block">
                    Download Pre-formatted CSV Template
                  </span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Includes required headers & sample items
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 transition"
                >
                  <Download className="w-3.5 h-3.5" /> Sample CSV
                </button>
              </div>

              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">
                  Upload .CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileUpload}
                  className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-theme-primary file:text-white cursor-pointer"
                />
              </div>

              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">
                  Or Paste CSV Content Directly:
                </label>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Item Name,Brand,Category,Barcode,SKU,Unit,Cost Price,Sale Price,Total Stock,Remaining Stock,Min Stock Alert&#10;Nestle MilkPak 1L,Nestle,Dairy,896400010012,MLK-001,ltr,280,330,100,100,10"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-theme-border font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={csvImporting || !csvText.trim()}
                  className="px-4 py-2 rounded-xl bg-theme-primary hover:bg-theme-dark disabled:opacity-50 text-white font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Upload className="w-4 h-4" />
                  {csvImporting ? "Processing CSV..." : "Process & Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteProduct}
        title="Delete Product"
        message={`Are you sure you want to permanently delete "${productToDelete?.itemName}" from the catalog?`}
        confirmText="Delete Product"
      />
    </div>
  );
}

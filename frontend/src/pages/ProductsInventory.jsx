import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Boxes,
  Package,
  TrendingUp,
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
  Eye,
  Truck,
  Calendar,
  DollarSign,
  Layers,
  Paintbrush,
  Check,
  RotateCcw,
  Receipt,
  Sliders,
  ShieldAlert,
  FolderTree,
  Bookmark,
  CreditCard,
  History
} from "lucide-react";
import api from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { TableSkeleton } from "../components/LoadingSkeleton";
import ConfirmModal from "../components/ConfirmModal";
import { StatCard } from "../components/common";
import { ColorSwatchBadge, getColorHex, getDisplayColorCode, isSampleColorCode } from "../utils/colorSwatches";

const UNIVERSAL_UNITS = [
  { value: "pcs", label: "Piece / Pcs", isDecimal: false },
  { value: "unit", label: "Unit", isDecimal: false },
  { value: "pack", label: "Packet / Pack", isDecimal: false },
  { value: "box", label: "Box", isDecimal: false },
  { value: "carton", label: "Carton", isDecimal: false },
  { value: "dozen", label: "Dozen", isDecimal: false },
  { value: "bottle", label: "Bottle", isDecimal: false },
  { value: "bag", label: "Bag / Sachet", isDecimal: false },
  { value: "kg", label: "Kilogram (KG)", isDecimal: true },
  { value: "g", label: "Gram (g)", isDecimal: true },
  { value: "L", label: "Litre (L)", isDecimal: true },
  { value: "ml", label: "Millilitre (ML)", isDecimal: true },
  { value: "meter", label: "Meter (m)", isDecimal: true },
  { value: "feet", label: "Feet (ft)", isDecimal: true },
  { value: "gallon", label: "Gallon", isDecimal: true },
  { value: "quarter", label: "Quarter", isDecimal: true },
  { value: "drum", label: "Drum", isDecimal: true },
  { value: "other", label: "Other / Custom", isDecimal: true }
];

const PAINT_TYPES = [
  "Plastic Emulsion",
  "Synthetic Enamel",
  "Weather Shield / Exterior",
  "Undercoat / Primer",
  "Matt Finish",
  "High Gloss",
  "Semi-Gloss / Satin",
  "Distemper",
  "Wall Putty / Filler",
  "Wood Varnish / Lacquer",
  "Texture Coating"
];

const PAINT_FINISHES = [
  "Matt",
  "Gloss",
  "Semi-Gloss",
  "Silk / Eggshell",
  "High Gloss",
  "Textured",
  "Metallic"
];

const PAINT_SIZES = [
  "Quarter (0.91 L)",
  "Gallon (3.64 L)",
  "Drum (14.56 L)",
  "Half Drum (7.28 L)",
  "1 Litre",
  "4 Litre",
  "10 Litre",
  "16 Litre",
  "20 Litre"
];

export default function ProductsInventory() {
  const { storeSettings } = useTheme();
  const { showToast } = useToast();
  const currency = storeSettings?.currency || "PKR";
  const [searchParams] = useSearchParams();

  // Core Data States
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  // Filter & Search States
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [stockFilter, setStockFilter] = useState("all"); // 'all' | 'in' | 'out' | 'low' | 'expired' | 'nearExpiry'
  const [minPriceFilter, setMinPriceFilter] = useState("");
  const [maxPriceFilter, setMaxPriceFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Modals Visibility
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);

  // Stock Replenishment Modal
  const [isReplenishModalOpen, setIsReplenishModalOpen] = useState(false);
  const [replenishProduct, setReplenishProduct] = useState(null);
  const [replenishQty, setReplenishQty] = useState(10);
  const [replenishPurchasePrice, setReplenishPurchasePrice] = useState(0);
  const [replenishSellingPrice, setReplenishSellingPrice] = useState(0);
  const [replenishSupplierMode, setReplenishSupplierMode] = useState("select");
  const [replenishSupplierId, setReplenishSupplierId] = useState("");
  const [replenishSupplierName, setReplenishSupplierName] = useState("");
  const [replenishSupplierPhone, setReplenishSupplierPhone] = useState("");
  const [replenishPurchaseDate, setReplenishPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [replenishInvoiceNumber, setReplenishInvoiceNumber] = useState("");
  const [replenishExpiryDate, setReplenishExpiryDate] = useState("");
  const [replenishPaidAmount, setReplenishPaidAmount] = useState(0);
  const [replenishPaymentMethod, setReplenishPaymentMethod] = useState("Cash");
  const [replenishNotes, setReplenishNotes] = useState("");
  const [replenishSubmitting, setReplenishSubmitting] = useState(false);

  // Product History & Audit Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [historyActiveTab, setHistoryActiveTab] = useState("overview");

  // Suppliers Overview & Payment Modal
  const [isSuppliersModalOpen, setIsSuppliersModalOpen] = useState(false);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [suppliersList, setSuppliersList] = useState([]);
  const [isSupplierPayModalOpen, setIsSupplierPayModalOpen] = useState(false);
  const [selectedSupplierForPay, setSelectedSupplierForPay] = useState(null);
  const [supplierPayAmount, setSupplierPayAmount] = useState(0);
  const [supplierPayMethod, setSupplierPayMethod] = useState("Cash");
  const [supplierPayRef, setSupplierPayRef] = useState("");
  const [supplierPayNotes, setSupplierPayNotes] = useState("");
  const [supplierPaySubmitting, setSupplierPaySubmitting] = useState(false);

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
  const [formSubcategory, setFormSubcategory] = useState("");
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
  const [formHasExpiry, setFormHasExpiry] = useState(false);
  const [formExpiryDate, setFormExpiryDate] = useState("");
  const [formImageFile, setFormImageFile] = useState(null);
  const [formImagePreview, setFormImagePreview] = useState("");

  // Paint Specialty Form Fields
  const [formIsPaint, setFormIsPaint] = useState(false);
  const [formPaintType, setFormPaintType] = useState("Plastic Emulsion");
  const [formColourName, setFormColourName] = useState("");
  const [formColorCode, setFormColorCode] = useState("");
  const [formShadeNumber, setFormShadeNumber] = useState("");
  const [formPaintSize, setFormPaintSize] = useState("Gallon (3.64 L)");
  const [formFinish, setFormFinish] = useState("Matt");
  const [formColorHex, setFormColorHex] = useState("");
  const [formCustomColorInfo, setFormCustomColorInfo] = useState("");

  // Supplier & Purchase Fields for Add Product
  const [formSupplierMode, setFormSupplierMode] = useState("select"); // 'select' | 'new'
  const [formSupplierId, setFormSupplierId] = useState("");
  const [formSupplierName, setFormSupplierName] = useState("");
  const [formSupplierPhone, setFormSupplierPhone] = useState("");
  const [formSupplierCompany, setFormSupplierCompany] = useState("");
  const [formPurchaseDate, setFormPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [formInvoiceNumber, setFormInvoiceNumber] = useState("");
  const [formPaidAmount, setFormPaidAmount] = useState(0);
  const [formPaymentMethod, setFormPaymentMethod] = useState("Cash");

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

  // =========================================================================
  // Fetch Products with Server-Side Database Filters
  // =========================================================================
  const fetchProducts = async (pageOverride) => {
    try {
      setLoading(true);
      const targetPage = pageOverride !== undefined ? pageOverride : currentPage;
      const res = await api.get("/products", {
        params: {
          search,
          category: selectedCategory,
          brand: selectedBrand,
          supplier: selectedSupplier,
          stockStatus: stockFilter,
          minPrice: minPriceFilter || undefined,
          maxPrice: maxPriceFilter || undefined,
          sortBy,
          sortOrder,
          page: targetPage,
          limit: pageSize
        }
      });
      if (res.data.success) {
        setProducts(res.data.products || []);
        setCategories(res.data.categories || []);
        setBrands(res.data.brands || []);
        setSuppliers(res.data.suppliers || []);
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
  }, [selectedCategory, selectedBrand, selectedSupplier, stockFilter, minPriceFilter, maxPriceFilter, sortBy, sortOrder, pageSize]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchProducts(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedCategory("all");
    setSelectedBrand("all");
    setSelectedSupplier("all");
    setStockFilter("all");
    setMinPriceFilter("");
    setMaxPriceFilter("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
      fetchProducts(page);
    }
  };

  // =========================================================================
  // First-Time Product Entry - Modal Controls & Live Calculations
  // =========================================================================
  const openAddProductModal = () => {
    setEditingProduct(null);
    setFormName("");
    setFormBarcode("");
    setFormSku("");
    const firstBrand = brands[0] ? (typeof brands[0] === "string" ? brands[0] : brands[0].name) : "General";
    const firstCat = categories[0] ? (typeof categories[0] === "string" ? categories[0] : categories[0].name) : "General";
    setFormBrand(firstBrand);
    setFormCategory(firstCat);
    setFormSubcategory("");
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
    setFormHasExpiry(false);
    setFormExpiryDate("");
    setFormImageFile(null);
    setFormImagePreview("");

    // Paint attributes reset
    setFormIsPaint(/paint/i.test(firstCat));
    setFormPaintType("Plastic Emulsion");
    setFormColourName("");
    setFormColorCode("");
    setFormShadeNumber("");
    setFormPaintSize("Gallon (3.64 L)");
    setFormFinish("Matt");
    setFormColorHex("");
    setFormCustomColorInfo("");

    // Supplier & Purchase reset
    setFormSupplierMode("select");
    setFormSupplierId(suppliers[0]?._id || "");
    setFormSupplierName("");
    setFormSupplierPhone("");
    setFormSupplierCompany("");
    setFormPurchaseDate(new Date().toISOString().split("T")[0]);
    setFormInvoiceNumber("");
    setFormPaidAmount(0);
    setFormPaymentMethod("Cash");

    setIsProductModalOpen(true);
  };

  const openEditProductModal = (p) => {
    setEditingProduct(p);
    setFormName(p.itemName);
    setFormBarcode(p.barcode || p.stockID || "");
    setFormSku(p.sku || "");
    setFormBrand(p.brandName || p.brand || "General");
    setFormCategory(p.category || "General");
    setFormSubcategory(p.subcategory || "");
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
    setFormHasExpiry(Boolean(p.expiryDate));
    setFormExpiryDate(p.expiryDate ? p.expiryDate.split("T")[0] : "");
    setFormImageFile(null);
    setFormImagePreview(p.image || "");

    // Paint attributes
    setFormIsPaint(Boolean(p.isPaint || /paint/i.test(p.category)));
    setFormPaintType(p.paintType || "Plastic Emulsion");
    setFormColourName(p.colourName || "");
    setFormColorCode(p.colorCode || "");
    setFormShadeNumber(p.shadeNumber || "");
    setFormPaintSize(p.paintSize || "Gallon (3.64 L)");
    setFormFinish(p.finish || "Matt");
    setFormColorHex(p.colorHex || "");
    setFormCustomColorInfo(p.customColorInfo || "");

    // Supplier link
    setFormSupplierMode("select");
    setFormSupplierId(p.supplierId || "");
    setFormSupplierName(p.supplierName || "");

    setIsProductModalOpen(true);
  };

  const autoGenerateBarcode = () => {
    const prefix = formCategory ? formCategory.slice(0, 3).toUpperCase() : "PRD";
    const rand = Math.floor(100000 + Math.random() * 900000);
    const code = `${prefix}-${rand}`;
    setFormBarcode(code);
    if (!formSku) setFormSku(code);
  };

  // Live Add Product Calculations
  const calculatedTotalPurchaseCost = useMemo(() => {
    const qty = parseFloat(formTotalProduct) || 0;
    const cost = parseFloat(formCostPrice) || 0;
    return Math.round(qty * cost * 100) / 100;
  }, [formTotalProduct, formCostPrice]);

  const calculatedExpectedSellingValue = useMemo(() => {
    const qty = parseFloat(formTotalProduct) || 0;
    const price = parseFloat(formSalePrice) || 0;
    return Math.round(qty * price * 100) / 100;
  }, [formTotalProduct, formSalePrice]);

  const calculatedExpectedProfit = useMemo(() => {
    return Math.round((calculatedExpectedSellingValue - calculatedTotalPurchaseCost) * 100) / 100;
  }, [calculatedExpectedSellingValue, calculatedTotalPurchaseCost]);

  const calculatedProfitMarginPercent = useMemo(() => {
    if (calculatedTotalPurchaseCost <= 0) return 0;
    return Math.round((calculatedExpectedProfit / calculatedTotalPurchaseCost) * 1000) / 10;
  }, [calculatedExpectedProfit, calculatedTotalPurchaseCost]);

  const calculatedRemainingSupplierBalance = useMemo(() => {
    const paid = parseFloat(formPaidAmount) || 0;
    return Math.max(0, Math.round((calculatedTotalPurchaseCost - paid) * 100) / 100);
  }, [calculatedTotalPurchaseCost, formPaidAmount]);

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
      showToast("Please select or enter a brand.", "error");
      return;
    }
    if (!formCategory || formCategory.trim() === "") {
      showToast("Please select or enter a category.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("itemName", formName.trim());
      formData.append("barcode", formBarcode.trim());
      formData.append("sku", formSku.trim() || formBarcode.trim());
      formData.append("brandName", formBrand.trim());
      formData.append("category", formCategory.trim());
      formData.append("subcategory", formSubcategory.trim());
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
      if (formHasExpiry && formExpiryDate) {
        formData.append("expiryDate", formExpiryDate);
      }
      if (formImageFile) formData.append("productImage", formImageFile);

      // Paint Attributes
      formData.append("isPaint", formIsPaint);
      if (formIsPaint) {
        formData.append("paintType", formPaintType);
        formData.append("colourName", formColourName.trim());
        formData.append("colorCode", formColorCode.trim());
        formData.append("shadeNumber", formShadeNumber.trim());
        formData.append("paintSize", formPaintSize);
        formData.append("finish", formFinish);
        formData.append("colorHex", formColorHex.trim());
        formData.append("customColorInfo", formCustomColorInfo.trim());
      }

      // Supplier & Purchase replenishment metadata for new product
      if (!editingProduct) {
        if (formSupplierMode === "select" && formSupplierId) {
          formData.append("supplierId", formSupplierId);
        } else if (formSupplierMode === "new" && formSupplierName.trim()) {
          formData.append("supplierName", formSupplierName.trim());
          formData.append("supplierPhone", formSupplierPhone.trim());
          formData.append("supplierCompany", formSupplierCompany.trim());
        }
        formData.append("purchaseDate", formPurchaseDate);
        formData.append("invoiceNumber", formInvoiceNumber.trim());
        formData.append("paidAmount", formPaidAmount);
        formData.append("paymentMethod", formPaymentMethod);
      }

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
        showToast(editingProduct ? "Product updated successfully!" : "Product created & initial purchase saved!", "success");
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

  // =========================================================================
  // Stock Replenishment (Stock In / Purchase)
  // =========================================================================
  const openReplenishModal = (prod = null) => {
    const target = prod || products[0] || null;
    setReplenishProduct(target);
    setReplenishQty(10);
    setReplenishPurchasePrice(target ? (target.costPrice || 0) : 0);
    setReplenishSellingPrice(target ? (target.salePrice || target.rate || 0) : 0);
    setReplenishSupplierMode("select");
    setReplenishSupplierId(target?.supplierId || suppliers[0]?._id || "");
    setReplenishSupplierName("");
    setReplenishSupplierPhone("");
    setReplenishPurchaseDate(new Date().toISOString().split("T")[0]);
    setReplenishInvoiceNumber("");
    setReplenishExpiryDate(target?.expiryDate ? target.expiryDate.split("T")[0] : "");
    setReplenishPaidAmount(0);
    setReplenishPaymentMethod("Cash");
    setReplenishNotes("");
    setIsReplenishModalOpen(true);
  };

  const replenishCalculatedTotalCost = useMemo(() => {
    const q = parseFloat(replenishQty) || 0;
    const c = parseFloat(replenishPurchasePrice) || 0;
    return Math.round(q * c * 100) / 100;
  }, [replenishQty, replenishPurchasePrice]);

  const replenishCalculatedBalanceDue = useMemo(() => {
    const p = parseFloat(replenishPaidAmount) || 0;
    return Math.max(0, Math.round((replenishCalculatedTotalCost - p) * 100) / 100);
  }, [replenishCalculatedTotalCost, replenishPaidAmount]);

  const handleReplenishSubmit = async (e) => {
    e.preventDefault();
    if (!replenishProduct) {
      showToast("Please select a product to restock.", "error");
      return;
    }
    const q = parseFloat(replenishQty);
    const c = parseFloat(replenishPurchasePrice);
    if (isNaN(q) || q <= 0) {
      showToast("Quantity must be greater than zero.", "error");
      return;
    }
    if (isNaN(c) || c < 0) {
      showToast("Purchase price must be a valid positive number.", "error");
      return;
    }

    try {
      setReplenishSubmitting(true);
      const payload = {
        productId: replenishProduct._id,
        quantity: q,
        purchasePrice: c,
        sellingPrice: parseFloat(replenishSellingPrice) || replenishProduct.salePrice,
        purchaseDate: replenishPurchaseDate,
        invoiceNumber: replenishInvoiceNumber.trim(),
        expiryDate: replenishExpiryDate || null,
        paidAmount: parseFloat(replenishPaidAmount) || 0,
        paymentMethod: replenishPaymentMethod,
        notes: replenishNotes.trim()
      };

      if (replenishSupplierMode === "select" && replenishSupplierId) {
        payload.supplierId = replenishSupplierId;
      } else if (replenishSupplierMode === "new" && replenishSupplierName.trim()) {
        payload.supplierName = replenishSupplierName.trim();
        payload.supplierPhone = replenishSupplierPhone.trim();
      }

      const res = await api.post("/products/restock", payload);
      if (res.data.success) {
        showToast(res.data.message || "Stock replenished successfully!", "success");
        setIsReplenishModalOpen(false);
        fetchProducts();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to restock product", "error");
    } finally {
      setReplenishSubmitting(false);
    }
  };

  // =========================================================================
  // Product Details & Comprehensive History
  // =========================================================================
  const openHistoryModal = async (prod) => {
    try {
      setIsHistoryModalOpen(true);
      setHistoryLoading(true);
      setHistoryActiveTab("overview");
      const res = await api.get(`/products/${prod._id}/history`);
      if (res.data.success) {
        setHistoryData(res.data);
      }
    } catch (err) {
      showToast("Failed to load product history: " + err.message, "error");
    } finally {
      setHistoryLoading(false);
    }
  };

  // =========================================================================
  // Suppliers Summary & Pay Supplier Modal
  // =========================================================================
  const openSuppliersModal = async () => {
    try {
      setIsSuppliersModalOpen(true);
      setSuppliersLoading(true);
      const res = await api.get("/purchases/suppliers/summary");
      if (res.data.success) {
        setSuppliersList(res.data.suppliers || []);
      }
    } catch (err) {
      showToast("Error loading suppliers: " + err.message, "error");
    } finally {
      setSuppliersLoading(false);
    }
  };

  const openSupplierPayModal = (sup) => {
    setSelectedSupplierForPay(sup);
    setSupplierPayAmount(sup.balanceDue || 0);
    setSupplierPayMethod("Cash");
    setSupplierPayRef("");
    setSupplierPayNotes("");
    setIsSupplierPayModalOpen(true);
  };

  const handleSupplierPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupplierForPay) return;
    const numAmt = parseFloat(supplierPayAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      showToast("Please enter a valid payment amount.", "error");
      return;
    }

    try {
      setSupplierPaySubmitting(true);
      const res = await api.post("/ledger/supplier-payment", {
        supplierId: selectedSupplierForPay._id,
        amount: numAmt,
        paymentMethod: supplierPayMethod,
        referenceNumber: supplierPayRef.trim(),
        notes: supplierPayNotes.trim()
      });
      if (res.data.success) {
        showToast(res.data.message || "Supplier payment recorded successfully!", "success");
        setIsSupplierPayModalOpen(false);
        openSuppliersModal(); // Refresh suppliers summary
        fetchProducts(); // Refresh product stats
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to record payment", "error");
    } finally {
      setSupplierPaySubmitting(false);
    }
  };

  // =========================================================================
  // Stock Adjustment (Damaged, Expired, Physical Audit)
  // =========================================================================
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

    try {
      const res = await api.post("/products/adjust-stock", {
        productId: stockProduct._id,
        adjustmentType,
        quantity: qty,
        reason: adjustReason.trim()
      });
      if (res.data.success) {
        showToast(res.data.message || "Stock adjusted successfully.", "success");
        setIsStockModalOpen(false);
        fetchProducts();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Stock adjustment failed", "error");
    }
  };

  // =========================================================================
  // Barcode Label Generation & Printing
  // =========================================================================
  const openBarcodeGenerator = (prod = null) => {
    const target = prod || products[0] || null;
    setBarcodeProduct(target);
    setBarcodeCount(8);
    setIsBarcodeModalOpen(true);
  };

  const handlePrintBarcodes = () => {
    const printArea = document.getElementById("barcode-labels-print-area");
    if (!printArea) return;
    const printWindow = window.open("", "_blank", "width=800,height=600");
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode Labels - ${barcodeProduct?.itemName}</title>
          <style>
            body { font-family: monospace; margin: 0; padding: 15px; }
            .label-grid { display: flex; flex-wrap: wrap; gap: 10px; }
            .label-item { border: 1px dashed #ccc; padding: 8px; width: 180px; text-align: center; }
            .store-title { font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
            .item-title { font-size: 11px; font-weight: bold; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .barcode-svg { max-width: 100%; height: 40px; margin: 0 auto; display: block; }
            .code-text { font-size: 11px; font-weight: bold; letter-spacing: 1px; margin-top: 2px; }
            .price-tag { font-size: 13px; font-weight: 900; margin-top: 4px; }
            @media print {
              body { padding: 0; }
              .label-item { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${printArea.innerHTML}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto text-theme-textPrimary">
      {/* Top Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-theme-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-btn bg-theme-iconBg text-theme-iconColor border border-theme-border flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Products & Inventory Management</h1>
            <p className="text-xs sm:text-sm text-theme-textMuted font-medium">
              Complete product lifecycle, purchase flow, supplier ledgers, stock alerts & POS sync.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Supplier Management */}
          <button
            type="button"
            onClick={openSuppliersModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn border border-theme-border bg-theme-card hover:bg-black/5 dark:hover:bg-white/5 text-theme-textPrimary font-medium text-xs shadow-card transition"
            title="Suppliers & Payables Khata"
          >
            <Truck className="w-3.5 h-3.5 text-theme-primary" /> Suppliers
          </button>

          {/* Barcode Stickers */}
          <button
            type="button"
            onClick={() => openBarcodeGenerator()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn border border-theme-border bg-theme-card hover:bg-black/5 dark:hover:bg-white/5 text-theme-textPrimary font-medium text-xs shadow-card transition"
            title="Generate printable Code128 barcode labels"
          >
            <Barcode className="w-3.5 h-3.5 text-theme-primary" /> Barcode Labels
          </button>

          {/* Stock In / Purchase Replenishment */}
          <button
            type="button"
            onClick={() => openReplenishModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-btn border border-theme-primary/30 bg-theme-primaryLight text-theme-primary font-bold text-xs hover:bg-theme-primary/20 shadow-card transition"
            title="Restock existing product or record incoming shipment"
          >
            <PlusCircle className="w-3.5 h-3.5" /> + Stock In / Purchase
          </button>

          {/* Add Brand New Product */}
          <button
            onClick={openAddProductModal}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-btn bg-[#14532D] hover:bg-[#104323] text-white font-bold text-xs shadow-card transition transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
        <StatCard
          title="Total Catalog"
          value={`${stats.totalProductsCount || products.length} Items`}
          icon={Boxes}
          badgeText="Active SKUs"
          badgeType="neutral"
          iconBg="bg-theme-iconBg"
          iconColor="text-theme-iconColor"
          subtitle="Registered Shop Products"
        />

        <StatCard
          title="Stock on Hand"
          value={`${stats.totalRemaining || 0} Units`}
          icon={Package}
          badgeText="Available"
          badgeType="success"
          iconBg="bg-emerald-500/10 dark:bg-emerald-950/40"
          iconColor="text-emerald-600 dark:text-emerald-400"
          subtitle="Physical Units in Store"
        />

        <StatCard
          title="Inventory Valuation"
          value={`${currency} ${(stats.totalCostValue || stats.remainingValue || 0).toLocaleString()}`}
          icon={TrendingUp}
          badgeText="Cost Basis"
          badgeType="info"
          iconBg="bg-indigo-500/10 dark:bg-indigo-950/40"
          iconColor="text-indigo-600 dark:text-indigo-400"
          subtitle={`Retail: ${currency} ${(stats.totalRetailValue || 0).toLocaleString()}`}
        />

        <StatCard
          title="Stock Alerts"
          value={`${products.filter((p) => p.remaining <= (p.minStockAlert || 5)).length} Low`}
          icon={AlertTriangle}
          badgeText="Action Needed"
          badgeType="warning"
          iconBg="bg-amber-500/10 dark:bg-amber-950/40"
          iconColor="text-amber-600 dark:text-amber-400"
          subtitle="Below Configured Alert Level"
        />
      </div>

      {/* Powerful Search & Multi-Filter Strip */}
      <div className="bg-theme-card border border-theme-border rounded-card p-3.5 shadow-card space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Universal Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-96">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-theme-textMuted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, barcode, SKU, brand, color..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-theme-inputBg border border-theme-inputBorder rounded-input focus:outline-none focus:ring-1 focus:ring-theme-primary text-theme-textPrimary placeholder:text-theme-placeholder font-medium"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-btn bg-[#14532D] hover:bg-[#104323] text-white font-bold text-xs shadow-xs transition"
            >
              Search
            </button>
          </form>

          {/* Quick Filter Selectors */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-theme-textPrimary font-semibold focus:outline-none focus:ring-1 focus:ring-theme-primary"
            >
              <option value="all">All Categories</option>
              {categories.map((c, idx) => (
                <option key={idx} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Brand Filter */}
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="px-3 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-theme-textPrimary font-semibold focus:outline-none focus:ring-1 focus:ring-theme-primary"
            >
              <option value="all">All Brands</option>
              {brands.map((b, idx) => (
                <option key={idx} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Supplier Filter */}
            {suppliers.length > 0 && (
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="px-3 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-theme-textPrimary font-semibold focus:outline-none focus:ring-1 focus:ring-theme-primary"
              >
                <option value="all">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.companyName || "Supplier"})
                  </option>
                ))}
              </select>
            )}

            {/* Stock Status Filter */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="px-3 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-theme-textPrimary font-semibold focus:outline-none focus:ring-1 focus:ring-theme-primary"
            >
              <option value="all">All Stock Levels</option>
              <option value="in">In Stock Only (&gt;0)</option>
              <option value="low">Low Stock Alerts</option>
              <option value="out">Out of Stock (=0)</option>
              <option value="nearExpiry">Expiring Soon (≤30d)</option>
              <option value="expired">Expired Lots</option>
            </select>

            {/* Reset Filters */}
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 rounded-btn border border-theme-border bg-theme-surface hover:bg-black/5 dark:hover:bg-white/5 text-theme-textMuted text-xs font-semibold transition"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 12-Column Professional Management Table */}
      {loading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : products.length === 0 ? (
        <div className="bg-theme-card border border-theme-border rounded-card p-12 text-center text-xs text-theme-textMuted shadow-card">
          <Boxes className="w-12 h-12 mx-auto mb-3 text-theme-textMuted opacity-40" />
          <p className="font-bold text-sm text-theme-textPrimary">No matching products found</p>
          <p className="mt-1">Try resetting your search filters or click "+ Add Product" to create your first inventory item.</p>
          <button
            onClick={openAddProductModal}
            className="mt-4 px-4 py-2 rounded-btn bg-[#14532D] hover:bg-[#104323] text-white font-bold text-xs shadow-card inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Product Now
          </button>
        </div>
      ) : (
        <div className="bg-theme-card border border-theme-border rounded-card shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-theme-tableHeader border-b border-theme-border text-[11px] font-bold text-theme-textMuted uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-3">SKU / Barcode</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-2 text-center">Unit</th>
                  <th className="py-3 px-3 text-right">Cost Price</th>
                  <th className="py-3 px-3 text-right">Sale Price</th>
                  <th className="py-3 px-3 text-center">Available Stock</th>
                  <th className="py-3 px-3 text-right">Stock Value</th>
                  <th className="py-3 px-3">Supplier</th>
                  <th className="py-3 px-3 text-center">Expiry</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {products.map((p) => {
                  const isOut = p.remaining <= 0;
                  const isLow = !isOut && p.remaining <= (p.minStockAlert || 5);
                  const isPerishable = Boolean(p.expiryDate);
                  const expDate = p.expiryDate ? new Date(p.expiryDate) : null;
                  const isExpired = expDate ? expDate <= new Date() : false;
                  const isNearExp = expDate && !isExpired ? (expDate - new Date()) / (1000 * 60 * 60 * 24) <= 30 : false;
                  const stockValue = Math.round((p.remaining || 0) * (p.costPrice || 0) * 100) / 100;

                  return (
                    <tr key={p._id} className="hover:bg-theme-tableHover transition">
                      {/* 1. Product Item & Image */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-btn bg-theme-surface border border-theme-border overflow-hidden flex items-center justify-center flex-shrink-0">
                            <img
                              src={p.image || "/images/product-placeholder.svg"}
                              alt={p.itemName}
                              className="w-full h-full object-contain p-0.5"
                              onError={(e) => {
                                e.target.src = "/images/product-placeholder.svg";
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-sm text-theme-textPrimary truncate max-w-[200px]" title={p.itemName}>
                              {p.itemName}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="text-[10px] font-semibold text-theme-textSecondary bg-black/5 dark:bg-white/5 px-1.5 py-0.2 rounded-badge">
                                {p.brandName || "General"}
                              </span>
                              {(p.colourName || p.colorCode) ? (
                                <ColorSwatchBadge product={p} size="sm" />
                              ) : p.isPaint ? (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-500/10 px-1.5 py-0.2 rounded-badge flex items-center gap-0.5">
                                  <Paintbrush className="w-2.5 h-2.5" />
                                  Paint
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. SKU / Barcode */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-theme-textPrimary text-xs">{p.barcode || p.stockID}</div>
                        {p.sku && p.sku !== p.barcode && (
                          <div className="text-[10px] text-theme-textMuted font-mono">SKU: {p.sku}</div>
                        )}
                      </td>

                      {/* 3. Category */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-theme-textPrimary block">{p.category}</span>
                        {p.subcategory && (
                          <span className="text-[10px] text-theme-textMuted block">{p.subcategory}</span>
                        )}
                      </td>

                      {/* 4. Unit */}
                      <td className="py-3 px-2 text-center font-bold text-theme-textSecondary uppercase text-[11px]">
                        {p.unit || "pcs"}
                      </td>

                      {/* 5. Purchase Price (Cost) */}
                      <td className="py-3 px-3 text-right font-medium text-theme-textSecondary font-mono">
                        {p.costPrice !== undefined ? `${currency} ${p.costPrice.toLocaleString()}` : "—"}
                      </td>

                      {/* 6. Selling Price */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-black text-theme-textPrimary font-mono">
                          {currency} {(p.salePrice || p.rate || 0).toLocaleString()}
                        </div>
                      </td>

                      {/* 7. Available Stock */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-badge text-xs font-bold ${
                            isOut
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : isLow
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {p.remaining} {p.unit || "pcs"}
                        </span>
                      </td>

                      {/* 8. Stock Value */}
                      <td className="py-3 px-3 text-right font-bold text-theme-textPrimary font-mono">
                        {currency} {stockValue.toLocaleString()}
                      </td>

                      {/* 9. Supplier */}
                      <td className="py-3 px-3 text-theme-textSecondary text-[11px] truncate max-w-[120px]">
                        {p.supplierName ? (
                          <span className="font-semibold truncate block" title={p.supplierName}>
                            {p.supplierName}
                          </span>
                        ) : (
                          <span className="text-theme-textMuted">—</span>
                        )}
                      </td>

                      {/* 10. Expiry Date */}
                      <td className="py-3 px-3 text-center">
                        {isPerishable ? (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-badge inline-block ${
                              isExpired
                                ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                : isNearExp
                                ? "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                                : "bg-black/5 dark:bg-white/5 text-theme-textSecondary"
                            }`}
                          >
                            {expDate.toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-theme-textMuted text-[11px]">N/A</span>
                        )}
                      </td>

                      {/* 11. Status */}
                      <td className="py-3 px-3 text-center">
                        {isExpired ? (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-badge bg-rose-500/15 text-rose-600">
                            Expired
                          </span>
                        ) : isOut ? (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-badge bg-rose-500/15 text-rose-600">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-badge bg-amber-500/15 text-amber-700 dark:text-amber-400">
                            Low Stock
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-badge bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                            In Stock
                          </span>
                        )}
                      </td>

                      {/* 12. Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* View History & Details */}
                          <button
                            type="button"
                            onClick={() => openHistoryModal(p)}
                            className="p-1.5 rounded-btn border border-theme-border hover:bg-theme-primary/10 text-theme-textSecondary hover:text-theme-primary transition"
                            title="Product Details & Full History"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Stock In / Replenish */}
                          <button
                            type="button"
                            onClick={() => openReplenishModal(p)}
                            className="p-1.5 rounded-btn bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 transition"
                            title="Stock In / Purchase More"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Product */}
                          <button
                            type="button"
                            onClick={() => openEditProductModal(p)}
                            className="p-1.5 rounded-btn border border-theme-border hover:bg-black/5 dark:hover:bg-white/5 text-theme-textSecondary transition"
                            title="Edit Product Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Stock Adjustment */}
                          <button
                            type="button"
                            onClick={() => {
                              setStockProduct(p);
                              setAdjustQty(1);
                              setAdjustReason("");
                              setIsStockModalOpen(true);
                            }}
                            className="p-1.5 rounded-btn border border-theme-border hover:bg-black/5 dark:hover:bg-white/5 text-theme-textSecondary transition"
                            title="Adjust Stock (Damage / Physical Audit)"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>

                          {/* Barcode Labels */}
                          <button
                            type="button"
                            onClick={() => openBarcodeGenerator(p)}
                            className="p-1.5 rounded-btn border border-theme-border hover:bg-black/5 dark:hover:bg-white/5 text-theme-textMuted transition"
                            title="Print Barcode Stickers"
                          >
                            <Barcode className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Product */}
                          <button
                            type="button"
                            onClick={() => setProductToDelete(p)}
                            className="p-1.5 rounded-btn hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
          <div className="px-5 py-3.5 border-t border-theme-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-theme-surface">
            <div className="flex items-center gap-3 text-theme-textSecondary">
              <span>
                Showing <strong className="text-theme-textPrimary">{totalProductsCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{" "}
                <strong className="text-theme-textPrimary">{Math.min(currentPage * pageSize, totalProductsCount)}</strong> of{" "}
                <strong className="text-theme-textPrimary">{totalProductsCount}</strong> products
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-theme-textMuted">Per Page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-theme-card border border-theme-border rounded-btn px-2 py-1 text-xs font-semibold text-theme-textPrimary focus:outline-none"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-btn border border-theme-border bg-theme-card hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none font-semibold transition"
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
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-btn border border-theme-border bg-theme-card hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none font-semibold transition"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD PRODUCT / FIRST-TIME ENTRY (COMPLETE FLOW)                   */}
      {/* ========================================================================= */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-card p-4 sm:p-6 max-w-3xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-theme-textPrimary flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-theme-primary" />
                  {editingProduct ? "Edit Product Catalog Details" : "Add New Product – First-Time Entry"}
                </h3>
                <p className="text-xs text-theme-textMuted mt-0.5">
                  {editingProduct
                    ? "Modify product specifications and catalog metadata."
                    : "Enter initial product specifications, first purchase batch, and supplier details."}
                </p>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-theme-textMuted hover:text-theme-textPrimary p-1 rounded-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs font-semibold">
              {/* SECTION A: Product Identity */}
              <div className="p-3.5 rounded-card bg-theme-surface border border-theme-border space-y-3">
                <span className="text-[11px] font-bold text-theme-primary uppercase tracking-wider block">
                  1. Product Identity & Classification
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-theme-textSecondary block mb-1">Product Name / Title *</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Master Super Emulsion White 4L"
                      className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input font-bold text-theme-textPrimary focus:ring-1 focus:ring-theme-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-theme-textSecondary block mb-1">Barcode *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formBarcode}
                        onChange={(e) => setFormBarcode(e.target.value)}
                        placeholder="Scan or auto-generate..."
                        className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input font-mono font-bold text-theme-textPrimary focus:ring-1 focus:ring-theme-primary focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={autoGenerateBarcode}
                        className="px-2.5 py-2 rounded-btn bg-[#14532D] text-white text-[11px] font-bold hover:bg-[#104323] whitespace-nowrap"
                        title="Auto-generate standard barcode"
                      >
                        Generate
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-theme-textSecondary block mb-1">Product Code / SKU</label>
                    <input
                      type="text"
                      value={formSku}
                      onChange={(e) => setFormSku(e.target.value)}
                      placeholder="e.g. SKU-1002"
                      className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input font-mono text-theme-textPrimary focus:ring-1 focus:ring-theme-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-theme-textSecondary block mb-1">Category *</label>
                    <input
                      type="text"
                      required
                      list="categories-list"
                      value={formCategory}
                      onChange={(e) => {
                        setFormCategory(e.target.value);
                        if (/paint/i.test(e.target.value)) setFormIsPaint(true);
                      }}
                      placeholder="e.g. Grocery, Paints, Beverages"
                      className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input font-bold text-theme-textPrimary focus:ring-1 focus:ring-theme-primary focus:outline-none"
                    />
                    <datalist id="categories-list">
                      {categories.map((c, i) => (
                        <option key={i} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="text-theme-textSecondary block mb-1">Subcategory (Optional)</label>
                    <input
                      type="text"
                      value={formSubcategory}
                      onChange={(e) => setFormSubcategory(e.target.value)}
                      placeholder="e.g. Dairy / Powder Milk"
                      className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input text-theme-textPrimary focus:ring-1 focus:ring-theme-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-theme-textSecondary block mb-1">Brand / Manufacturer *</label>
                    <input
                      type="text"
                      required
                      list="brands-list"
                      value={formBrand}
                      onChange={(e) => setFormBrand(e.target.value)}
                      placeholder="e.g. Unilever, Nestlé, Berger Paints"
                      className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input font-bold text-theme-textPrimary focus:ring-1 focus:ring-theme-primary focus:outline-none"
                    />
                    <datalist id="brands-list">
                      {brands.map((b, i) => (
                        <option key={i} value={b} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="text-theme-textSecondary block mb-1">Product Description (Optional)</label>
                    <input
                      type="text"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Brief notes, packaging, specs..."
                      className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input text-theme-textPrimary focus:ring-1 focus:ring-theme-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION B: Units, Decimals & Paint Specialty Attributes */}
              <div className="p-3.5 rounded-card bg-theme-surface border border-theme-border space-y-3">
                <span className="text-[11px] font-bold text-theme-primary uppercase tracking-wider block">
                  2. Unit of Measurement & Product Specifics
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div>
                    <label className="text-theme-textSecondary block mb-1">Unit of Measurement *</label>
                    <select
                      value={formUnit}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormUnit(val);
                        const matched = UNIVERSAL_UNITS.find((u) => u.value === val);
                        if (matched && matched.isDecimal) {
                          setFormDecimal(true);
                        }
                      }}
                      className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input font-bold text-theme-textPrimary focus:outline-none"
                    >
                      {UNIVERSAL_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      id="allowDecimalCheck"
                      checked={formDecimal}
                      onChange={(e) => setFormDecimal(e.target.checked)}
                      className="w-4 h-4 rounded text-theme-primary focus:ring-theme-primary cursor-pointer"
                    />
                    <label htmlFor="allowDecimalCheck" className="text-xs font-bold text-theme-textPrimary cursor-pointer">
                      Allow Fractional Sales (e.g. 1.5 KG, 2.5 L)
                    </label>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      id="isPaintCheck"
                      checked={formIsPaint}
                      onChange={(e) => setFormIsPaint(e.target.checked)}
                      className="w-4 h-4 rounded text-theme-primary focus:ring-theme-primary cursor-pointer"
                    />
                    <label htmlFor="isPaintCheck" className="text-xs font-bold text-theme-textPrimary cursor-pointer flex items-center gap-1">
                      <Paintbrush className="w-3.5 h-3.5 text-amber-600" />
                      Paint / Color Specification
                    </label>
                  </div>
                </div>

                {/* Paint Specialty Details (Shown if Paint checked or selected) */}
                {formIsPaint && (
                  <div className="p-3 rounded-card bg-amber-500/10 border border-amber-500/20 space-y-2.5 animate-in fade-in">
                    <div className="text-[11px] font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <Paintbrush className="w-3.5 h-3.5" />
                      Paint Product Attributes (Shade, Tint, Code & Texture)
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="text-[10px] uppercase text-amber-900 dark:text-amber-200 block mb-1">Paint Type</label>
                        <select
                          value={formPaintType}
                          onChange={(e) => setFormPaintType(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-xs font-bold"
                        >
                          {PAINT_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase text-amber-900 dark:text-amber-200 block mb-1 flex items-center justify-between">
                          <span>Colour Name</span>
                          {formColourName && (
                            <span
                              className="w-3 h-3 rounded-full border border-black/30 inline-block shadow-2xs"
                              style={{ backgroundColor: getColorHex({ colourName: formColourName, colorHex: formColorHex }) }}
                              title="Detected Swatch"
                            />
                          )}
                        </label>
                        <input
                          type="text"
                          value={formColourName}
                          onChange={(e) => setFormColourName(e.target.value)}
                          placeholder="e.g. Pure White / Sky Blue"
                          className="w-full px-2.5 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase text-amber-900 dark:text-amber-200 block mb-1">
                          Colour Code <span className="text-[9px] text-amber-700/80 font-normal">(e.g. WL-WHT-001)</span>
                        </label>
                        <input
                          type="text"
                          value={formColorCode}
                          onChange={(e) => setFormColorCode(e.target.value)}
                          placeholder="e.g. WL-WHT-001 (Sample Code)"
                          className="w-full px-2.5 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase text-amber-900 dark:text-amber-200 block mb-1">Shade Number</label>
                        <input
                          type="text"
                          value={formShadeNumber}
                          onChange={(e) => setFormShadeNumber(e.target.value)}
                          placeholder="e.g. SH-WL-001"
                          className="w-full px-2.5 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase text-amber-900 dark:text-amber-200 block mb-1">Size / Volume</label>
                        <select
                          value={formPaintSize}
                          onChange={(e) => setFormPaintSize(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-xs font-bold"
                        >
                          {PAINT_SIZES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase text-amber-900 dark:text-amber-200 block mb-1">Finish Type</label>
                        <select
                          value={formFinish}
                          onChange={(e) => setFormFinish(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-xs font-bold"
                        >
                          {PAINT_FINISHES.map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] uppercase text-amber-900 dark:text-amber-200 block mb-1">
                          Tint Formula / Batch Notes <span className="text-[9px] text-amber-700/80 font-normal">(Sample Testing Notes)</span>
                        </label>
                        <input
                          type="text"
                          value={formCustomColorInfo}
                          onChange={(e) => setFormCustomColorInfo(e.target.value)}
                          placeholder="e.g. Sample Testing Code - Not Official Manufacturer Code"
                          className="w-full px-2.5 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION C: Pricing, Initial Stock & Expiry */}
              <div className="p-3.5 rounded-card bg-theme-surface border border-theme-border space-y-3">
                <span className="text-[11px] font-bold text-theme-primary uppercase tracking-wider block">
                  3. Pricing & Initial Inventory
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-theme-textSecondary block mb-1">Purchase Price ({currency}) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={formCostPrice}
                      onChange={(e) => setFormCostPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input font-mono font-bold text-theme-textPrimary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-theme-textSecondary block mb-1">Selling Price ({currency}) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={formSalePrice}
                      onChange={(e) => setFormSalePrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input font-mono font-bold text-theme-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-theme-textSecondary block mb-1">Initial Stock Qty *</label>
                    <input
                      type="number"
                      step={formDecimal ? "any" : "1"}
                      min="0"
                      required
                      value={formTotalProduct}
                      onChange={(e) => setFormTotalProduct(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input font-mono font-bold text-theme-textPrimary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-theme-textSecondary block mb-1">Min Stock Alert</label>
                    <input
                      type="number"
                      min="0"
                      value={formMinAlert}
                      onChange={(e) => setFormMinAlert(parseInt(e.target.value) || 5)}
                      className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input font-mono text-theme-textPrimary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Expiry Date Checkbox & Input */}
                <div className="pt-1 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hasExpiryCheck"
                      checked={formHasExpiry}
                      onChange={(e) => setFormHasExpiry(e.target.checked)}
                      className="w-4 h-4 rounded text-theme-primary focus:ring-theme-primary cursor-pointer"
                    />
                    <label htmlFor="hasExpiryCheck" className="text-xs font-bold text-theme-textPrimary cursor-pointer flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Product Has Expiry Date (Perishable)
                    </label>
                  </div>

                  {formHasExpiry && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-theme-textSecondary font-semibold">Expiry Date:</span>
                      <input
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        value={formExpiryDate}
                        onChange={(e) => setFormExpiryDate(e.target.value)}
                        className="px-3 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-xs font-bold text-theme-primary focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION D: Supplier & Purchase Bill Details (Only for First-Time Entry) */}
              {!editingProduct && (
                <div className="p-3.5 rounded-card bg-theme-surface border border-theme-border space-y-3">
                  <span className="text-[11px] font-bold text-theme-primary uppercase tracking-wider block">
                    4. Supplier Details & Purchase Payment
                  </span>

                  <div className="flex items-center gap-4 text-xs">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="supplierMode"
                        checked={formSupplierMode === "select"}
                        onChange={() => setFormSupplierMode("select")}
                        className="text-theme-primary"
                      />
                      <span>Select Existing Supplier</span>
                    </label>

                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="supplierMode"
                        checked={formSupplierMode === "new"}
                        onChange={() => setFormSupplierMode("new")}
                        className="text-theme-primary"
                      />
                      <span>+ Register New Supplier</span>
                    </label>
                  </div>

                  {formSupplierMode === "select" ? (
                    <div>
                      <select
                        value={formSupplierId}
                        onChange={(e) => setFormSupplierId(e.target.value)}
                        className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input font-semibold text-theme-textPrimary focus:outline-none"
                      >
                        <option value="">-- Choose Supplier (Optional) --</option>
                        {suppliers.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.name} ({s.companyName || "Supplier"}) - Balance Due: {currency} {s.balanceDue?.toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[11px] text-theme-textMuted block mb-0.5">Supplier Name *</label>
                        <input
                          type="text"
                          value={formSupplierName}
                          onChange={(e) => setFormSupplierName(e.target.value)}
                          placeholder="e.g. Tariq Goods / Wholesale"
                          className="w-full px-2.5 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-theme-textMuted block mb-0.5">Phone Number</label>
                        <input
                          type="text"
                          value={formSupplierPhone}
                          onChange={(e) => setFormSupplierPhone(e.target.value)}
                          placeholder="0300-1234567"
                          className="w-full px-2.5 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-theme-textMuted block mb-0.5">Company Name</label>
                        <input
                          type="text"
                          value={formSupplierCompany}
                          onChange={(e) => setFormSupplierCompany(e.target.value)}
                          placeholder="e.g. Metro Wholesale"
                          className="w-full px-2.5 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-theme-textSecondary block mb-1">Purchase Date</label>
                      <input
                        type="date"
                        value={formPurchaseDate}
                        onChange={(e) => setFormPurchaseDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-theme-textSecondary block mb-1">Invoice / Reference #</label>
                      <input
                        type="text"
                        value={formInvoiceNumber}
                        onChange={(e) => setFormInvoiceNumber(e.target.value)}
                        placeholder="e.g. INV-9021"
                        className="w-full px-3 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-theme-textSecondary block mb-1">Upfront Paid ({currency})</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={formPaidAmount}
                        onChange={(e) => setFormPaidAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0 for full credit"
                        className="w-full px-3 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-xs font-mono font-bold text-emerald-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION E: Auto-Calculated Financial Summary Bar */}
              {!editingProduct && (
                <div className="p-3.5 rounded-card bg-[#14532D]/10 border border-[#14532D]/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div>
                    <span className="text-[10px] text-theme-textMuted uppercase font-bold block">Total Purchase Cost</span>
                    <span className="text-sm sm:text-base font-black text-theme-textPrimary font-mono">
                      {currency} {calculatedTotalPurchaseCost.toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-theme-textMuted uppercase font-bold block">Expected Selling Value</span>
                    <span className="text-sm sm:text-base font-black text-theme-primary font-mono">
                      {currency} {calculatedExpectedSellingValue.toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-theme-textMuted uppercase font-bold block">Expected Profit ({calculatedProfitMarginPercent}%)</span>
                    <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      +{currency} {calculatedExpectedProfit.toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-theme-textMuted uppercase font-bold block">Remaining Supplier Balance</span>
                    <span className={`text-sm sm:text-base font-black font-mono ${calculatedRemainingSupplierBalance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {currency} {calculatedRemainingSupplierBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Product Image Upload */}
              <div className="flex items-center gap-3 pt-1">
                {formImagePreview ? (
                  <div className="relative group">
                    <img
                      src={formImagePreview}
                      alt="Preview"
                      className="w-12 h-12 rounded-btn object-contain border border-theme-border bg-theme-surface"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormImageFile(null);
                        setFormImagePreview("");
                      }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-btn border border-dashed border-theme-border flex items-center justify-center text-theme-textMuted bg-theme-surface">
                    <ImageIcon className="w-5 h-5 opacity-40" />
                  </div>
                )}
                <div>
                  <label className="text-[11px] text-theme-textSecondary block mb-0.5">Product Image (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="text-xs text-theme-textMuted file:mr-2 file:py-1 file:px-2.5 file:rounded-btn file:border-0 file:text-xs file:font-semibold file:bg-theme-surface file:text-theme-primary cursor-pointer"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-btn border border-theme-border hover:bg-black/5 dark:hover:bg-white/5 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-btn bg-[#14532D] hover:bg-[#104323] text-white font-bold shadow-card transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingProduct ? "Update Catalog Item" : "Save & Add to Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: STOCK REPLENISHMENT (STOCK IN / PURCHASE)                        */}
      {/* ========================================================================= */}
      {isReplenishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-card p-5 sm:p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <div>
                <h3 className="font-extrabold text-base text-theme-textPrimary flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-emerald-600" />
                  Stock In / Purchase Replenishment
                </h3>
                <p className="text-xs text-theme-textMuted mt-0.5">
                  Restock existing inventory with a new purchase invoice, supplier link & batch.
                </p>
              </div>
              <button onClick={() => setIsReplenishModalOpen(false)} className="text-theme-textMuted hover:text-theme-textPrimary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReplenishSubmit} className="space-y-3.5 text-xs font-semibold">
              {/* Product Selector */}
              <div>
                <label className="text-theme-textSecondary block mb-1">Select Product to Restock *</label>
                <select
                  value={replenishProduct?._id || ""}
                  onChange={(e) => {
                    const found = products.find((p) => p._id === e.target.value);
                    setReplenishProduct(found || null);
                    if (found) {
                      setReplenishPurchasePrice(found.costPrice || 0);
                      setReplenishSellingPrice(found.salePrice || found.rate || 0);
                      setReplenishSupplierId(found.supplierId || suppliers[0]?._id || "");
                    }
                  }}
                  required
                  className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input font-bold text-theme-textPrimary focus:outline-none"
                >
                  <option value="">-- Choose Existing Product --</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.itemName} ({p.remaining} {p.unit || "pcs"} in stock) - [{p.barcode || p.stockID}]
                    </option>
                  ))}
                </select>
              </div>

              {replenishProduct && (
                <div className="p-3 rounded-card bg-theme-surface border border-theme-border flex items-center justify-between text-xs">
                  <div>
                    <span className="text-theme-textMuted block">Current Stock:</span>
                    <span className="font-extrabold text-theme-textPrimary">{replenishProduct.remaining} {replenishProduct.unit}</span>
                  </div>
                  <div>
                    <span className="text-theme-textMuted block">Last Purchase Cost:</span>
                    <span className="font-extrabold text-theme-textPrimary">{currency} {replenishProduct.costPrice || 0}</span>
                  </div>
                  <div>
                    <span className="text-theme-textMuted block">Current Retail Price:</span>
                    <span className="font-extrabold text-theme-primary">{currency} {replenishProduct.salePrice || replenishProduct.rate}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-theme-textSecondary block mb-1">New Purchase Qty *</label>
                  <input
                    type="number"
                    step={replenishProduct?.allowDecimal ? "any" : "1"}
                    min="0.001"
                    required
                    value={replenishQty}
                    onChange={(e) => setReplenishQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-theme-textSecondary block mb-1">Purchase Price ({currency}) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={replenishPurchasePrice}
                    onChange={(e) => setReplenishPurchasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-theme-textSecondary block mb-1">Selling Price ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={replenishSellingPrice}
                    onChange={(e) => setReplenishSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input font-mono font-bold text-theme-primary"
                  />
                </div>
              </div>

              {/* Supplier Selection */}
              <div>
                <label className="text-theme-textSecondary block mb-1">Supplier</label>
                <select
                  value={replenishSupplierId}
                  onChange={(e) => setReplenishSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input font-semibold"
                >
                  <option value="">Central / Unassigned Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.companyName || "Supplier"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-theme-textSecondary block mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={replenishPurchaseDate}
                    onChange={(e) => setReplenishPurchaseDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-theme-textSecondary block mb-1">Invoice / Reference Number</label>
                  <input
                    type="text"
                    value={replenishInvoiceNumber}
                    onChange={(e) => setReplenishInvoiceNumber(e.target.value)}
                    placeholder="e.g. BILL-9021"
                    className="w-full px-3 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-theme-textSecondary block mb-1">Paid Amount ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={replenishPaidAmount}
                    onChange={(e) => setReplenishPaidAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0 for credit"
                    className="w-full px-3 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-xs font-mono font-bold text-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-theme-textSecondary block mb-1">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={replenishExpiryDate}
                    onChange={(e) => setReplenishExpiryDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-xs"
                  />
                </div>
              </div>

              {/* Financial Calculation Banner */}
              <div className="p-3 rounded-card bg-[#14532D]/10 border border-[#14532D]/20 flex items-center justify-between text-xs font-bold">
                <div>
                  <span className="text-theme-textMuted block text-[10px]">Total Purchase Cost</span>
                  <span className="text-sm font-black text-theme-textPrimary font-mono">
                    {currency} {replenishCalculatedTotalCost.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-theme-textMuted block text-[10px]">Remaining Balance Payable</span>
                  <span className={`text-sm font-black font-mono ${replenishCalculatedBalanceDue > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {currency} {replenishCalculatedBalanceDue.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setIsReplenishModalOpen(false)}
                  className="px-4 py-2 rounded-btn border border-theme-border hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={replenishSubmitting}
                  className="px-5 py-2 rounded-btn bg-[#14532D] hover:bg-[#104323] text-white font-bold shadow-card transition"
                >
                  {replenishSubmitting ? "Stocking In..." : "Confirm & Restock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PRODUCT DETAILS & COMPREHENSIVE HISTORY                           */}
      {/* ========================================================================= */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-card p-4 sm:p-6 max-w-4xl w-full shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-btn bg-theme-iconBg text-theme-iconColor flex items-center justify-center font-bold">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-theme-textPrimary">
                    {historyData?.product?.itemName || "Product Lifecycle & History"}
                  </h3>
                  <div className="text-xs text-theme-textMuted font-mono">
                    SKU: {historyData?.product?.stockID} • Barcode: {historyData?.product?.barcode || "N/A"}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-theme-textMuted hover:text-theme-textPrimary">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 border-b border-theme-border pb-1 text-xs">
              <button
                type="button"
                onClick={() => setHistoryActiveTab("overview")}
                className={`px-3 py-1.5 rounded-btn font-bold transition ${
                  historyActiveTab === "overview" ? "bg-[#14532D] text-white shadow-xs" : "hover:bg-theme-surface text-theme-textSecondary"
                }`}
              >
                Overview & Specs
              </button>
              <button
                type="button"
                onClick={() => setHistoryActiveTab("purchases")}
                className={`px-3 py-1.5 rounded-btn font-bold transition ${
                  historyActiveTab === "purchases" ? "bg-[#14532D] text-white shadow-xs" : "hover:bg-theme-surface text-theme-textSecondary"
                }`}
              >
                Purchase Invoices ({historyData?.purchases?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setHistoryActiveTab("batches")}
                className={`px-3 py-1.5 rounded-btn font-bold transition ${
                  historyActiveTab === "batches" ? "bg-[#14532D] text-white shadow-xs" : "hover:bg-theme-surface text-theme-textSecondary"
                }`}
              >
                Lot Batches ({historyData?.batches?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setHistoryActiveTab("audits")}
                className={`px-3 py-1.5 rounded-btn font-bold transition ${
                  historyActiveTab === "audits" ? "bg-[#14532D] text-white shadow-xs" : "hover:bg-theme-surface text-theme-textSecondary"
                }`}
              >
                Stock Movements ({historyData?.audits?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setHistoryActiveTab("sales")}
                className={`px-3 py-1.5 rounded-btn font-bold transition ${
                  historyActiveTab === "sales" ? "bg-[#14532D] text-white shadow-xs" : "hover:bg-theme-surface text-theme-textSecondary"
                }`}
              >
                Recent Sales ({historyData?.recentSales?.length || 0})
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto space-y-3 text-xs">
              {historyLoading ? (
                <div className="py-12 text-center text-theme-textMuted">Loading product history...</div>
              ) : !historyData?.product ? (
                <div className="py-12 text-center text-theme-textMuted">No details found.</div>
              ) : (
                <>
                  {/* TAB 1: OVERVIEW */}
                  {historyActiveTab === "overview" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-card bg-theme-surface border border-theme-border">
                          <span className="text-[10px] text-theme-textMuted uppercase font-bold block">Available Stock</span>
                          <span className="text-lg font-black text-theme-textPrimary font-mono">
                            {historyData.product.remaining} {historyData.product.unit}
                          </span>
                        </div>
                        <div className="p-3 rounded-card bg-theme-surface border border-theme-border">
                          <span className="text-[10px] text-theme-textMuted uppercase font-bold block">Cost Price</span>
                          <span className="text-lg font-black text-theme-textSecondary font-mono">
                            {currency} {historyData.product.costPrice}
                          </span>
                        </div>
                        <div className="p-3 rounded-card bg-theme-surface border border-theme-border">
                          <span className="text-[10px] text-theme-textMuted uppercase font-bold block">Retail Price</span>
                          <span className="text-lg font-black text-theme-primary font-mono">
                            {currency} {historyData.product.salePrice || historyData.product.rate}
                          </span>
                        </div>
                        <div className="p-3 rounded-card bg-theme-surface border border-theme-border">
                          <span className="text-[10px] text-theme-textMuted uppercase font-bold block">Inventory Value</span>
                          <span className="text-lg font-black text-theme-textPrimary font-mono">
                            {currency} {Math.round((historyData.product.remaining || 0) * (historyData.product.costPrice || 0)).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Paint Specialty Attributes & Colour Swatch Card */}
                      {(historyData.product.isPaint || historyData.product.colourName || historyData.product.colorCode) && (
                        <div className="p-4 rounded-card bg-amber-500/10 border border-amber-500/20 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-sm">
                              <Paintbrush className="w-4 h-4" /> Paint Specifications & Colour Swatch
                            </div>
                            {isSampleColorCode(historyData.product.colorCode) && (
                              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                Sample Testing Code
                              </span>
                            )}
                          </div>

                          {/* Colour Swatch Preview Bar */}
                          {(historyData.product.colourName || historyData.product.colorCode) && (
                            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-theme-card border border-theme-border">
                              <div
                                className="w-9 h-9 rounded-lg shadow-sm border border-black/20 flex-shrink-0"
                                style={{ backgroundColor: getColorHex(historyData.product) }}
                              />
                              <div>
                                <div className="text-xs font-bold text-theme-textPrimary flex items-center gap-2">
                                  <span>{historyData.product.colourName || "Paint Colour"}</span>
                                  {historyData.product.colorCode && (
                                    <span className="font-mono text-[11px] font-bold text-theme-primary bg-theme-primary/10 px-1.5 py-0.5 rounded">
                                      {getDisplayColorCode(historyData.product.colorCode)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-theme-textMuted mt-0.5">
                                  HEX: <span className="font-mono font-semibold">{getColorHex(historyData.product)}</span>
                                  {historyData.product.finish ? ` • Finish: ${historyData.product.finish}` : ""}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div><strong className="text-theme-textMuted block">Paint Type:</strong> {historyData.product.paintType || "N/A"}</div>
                            <div><strong className="text-theme-textMuted block">Colour Name:</strong> {historyData.product.colourName || "N/A"}</div>
                            <div><strong className="text-theme-textMuted block">Colour Code:</strong> {getDisplayColorCode(historyData.product.colorCode) || "N/A"}</div>
                            <div><strong className="text-theme-textMuted block">Shade Number:</strong> {historyData.product.shadeNumber || "N/A"}</div>
                            <div><strong className="text-theme-textMuted block">Volume / Size:</strong> {historyData.product.paintSize || "N/A"}</div>
                            <div><strong className="text-theme-textMuted block">Finish:</strong> {historyData.product.finish || "N/A"}</div>
                            <div className="sm:col-span-2"><strong className="text-theme-textMuted block">Formula / Notes:</strong> {historyData.product.customColorInfo || "Standard Formulation"}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: PURCHASES */}
                  {historyActiveTab === "purchases" && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-theme-tableHeader text-[10px] font-bold text-theme-textMuted uppercase border-b border-theme-border">
                          <tr>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">PO & Invoice</th>
                            <th className="p-2.5">Supplier</th>
                            <th className="p-2.5 text-center">Qty</th>
                            <th className="p-2.5 text-right">Cost Price</th>
                            <th className="p-2.5 text-right">Total Cost</th>
                            <th className="p-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-theme-border">
                          {(historyData.purchases || []).length === 0 ? (
                            <tr><td colSpan={7} className="py-8 text-center text-theme-textMuted">No purchase records found for this product.</td></tr>
                          ) : (
                            historyData.purchases.map((po) => {
                              const itm = po.items?.find((i) => String(i.productId) === String(historyData.product._id)) || po.items?.[0] || {};
                              return (
                                <tr key={po._id} className="hover:bg-theme-tableHover">
                                  <td className="p-2.5 text-theme-textMuted">{new Date(po.purchaseDate).toLocaleDateString()}</td>
                                  <td className="p-2.5 font-bold font-mono text-theme-textPrimary">
                                    {po.purchaseNumber} {po.invoiceNumber && <span className="text-theme-textMuted font-normal">(Inv #{po.invoiceNumber})</span>}
                                  </td>
                                  <td className="p-2.5 font-semibold text-theme-textSecondary">{po.supplierName || "—"}</td>
                                  <td className="p-2.5 text-center font-bold">{itm.quantity}</td>
                                  <td className="p-2.5 text-right font-mono">{currency} {itm.purchasePrice}</td>
                                  <td className="p-2.5 text-right font-mono font-bold">{currency} {itm.totalCost}</td>
                                  <td className="p-2.5 text-center">
                                    <span className="px-2 py-0.5 rounded-badge text-[10px] font-bold bg-theme-primaryLight text-theme-primary">
                                      {po.paymentStatus}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* TAB 3: BATCHES */}
                  {historyActiveTab === "batches" && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-theme-tableHeader text-[10px] font-bold text-theme-textMuted uppercase border-b border-theme-border">
                          <tr>
                            <th className="p-2.5">Batch / Lot #</th>
                            <th className="p-2.5">Expiry Date</th>
                            <th className="p-2.5 text-center">Remaining / Received</th>
                            <th className="p-2.5 text-right">Cost Price</th>
                            <th className="p-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-theme-border">
                          {(historyData.batches || []).length === 0 ? (
                            <tr><td colSpan={5} className="py-8 text-center text-theme-textMuted">No lot batches registered for this product.</td></tr>
                          ) : (
                            historyData.batches.map((b) => (
                              <tr key={b._id} className="hover:bg-theme-tableHover">
                                <td className="p-2.5 font-bold font-mono text-theme-primary">{b.batchNumber}</td>
                                <td className="p-2.5">{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : "No Expiry"}</td>
                                <td className="p-2.5 text-center font-bold">
                                  {b.quantityRemaining} / {b.quantityReceived}
                                </td>
                                <td className="p-2.5 text-right font-mono">{currency} {b.costPrice}</td>
                                <td className="p-2.5 text-center">
                                  <span className={`px-2 py-0.5 rounded-badge text-[10px] font-bold ${
                                    b.status === "Active" ? "bg-emerald-500/10 text-emerald-700" : "bg-black/5 text-theme-textMuted"
                                  }`}>
                                    {b.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* TAB 4: AUDITS / STOCK MOVEMENTS */}
                  {historyActiveTab === "audits" && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-theme-tableHeader text-[10px] font-bold text-theme-textMuted uppercase border-b border-theme-border">
                          <tr>
                            <th className="p-2.5">Timestamp</th>
                            <th className="p-2.5">Movement Type</th>
                            <th className="p-2.5 text-center">Change Qty</th>
                            <th className="p-2.5 text-center">New Stock</th>
                            <th className="p-2.5">Reason / Reference</th>
                            <th className="p-2.5">User</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-theme-border">
                          {(historyData.audits || []).length === 0 ? (
                            <tr><td colSpan={6} className="py-8 text-center text-theme-textMuted">No stock movement logs recorded.</td></tr>
                          ) : (
                            historyData.audits.map((a) => (
                              <tr key={a._id} className="hover:bg-theme-tableHover">
                                <td className="p-2.5 text-theme-textMuted">{new Date(a.createdAt).toLocaleString()}</td>
                                <td className="p-2.5 font-bold text-theme-textPrimary">{a.adjustmentType}</td>
                                <td className={`p-2.5 text-center font-bold font-mono ${a.changeQuantity > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                  {a.changeQuantity > 0 ? `+${a.changeQuantity}` : a.changeQuantity}
                                </td>
                                <td className="p-2.5 text-center font-bold font-mono">{a.newQuantity}</td>
                                <td className="p-2.5 text-theme-textSecondary truncate max-w-xs">{a.reason || "—"}</td>
                                <td className="p-2.5 text-theme-textMuted">{a.adjustedBy || "Admin"}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* TAB 5: RECENT SALES */}
                  {historyActiveTab === "sales" && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-theme-tableHeader text-[10px] font-bold text-theme-textMuted uppercase border-b border-theme-border">
                          <tr>
                            <th className="p-2.5">Sale Date</th>
                            <th className="p-2.5">Bill ID</th>
                            <th className="p-2.5 text-center">Qty Sold</th>
                            <th className="p-2.5 text-right">Sale Rate</th>
                            <th className="p-2.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-theme-border">
                          {(historyData.recentSales || []).length === 0 ? (
                            <tr><td colSpan={5} className="py-8 text-center text-theme-textMuted">No recent sales records for this product.</td></tr>
                          ) : (
                            historyData.recentSales.map((s) => (
                              <tr key={s._id} className="hover:bg-theme-tableHover">
                                <td className="p-2.5 text-theme-textMuted">{new Date(s.date).toLocaleDateString()}</td>
                                <td className="p-2.5 font-bold font-mono text-theme-primary">{s.billId || "POS-SALE"}</td>
                                <td className="p-2.5 text-center font-bold">{s.quantity} {historyData.product.unit}</td>
                                <td className="p-2.5 text-right font-mono">{currency} {s.rate}</td>
                                <td className="p-2.5 text-right font-bold font-mono">{currency} {s.total}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-theme-border">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 rounded-btn bg-[#14532D] text-white font-bold text-xs"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: SUPPLIERS MANAGEMENT & AP PAYABLES KHATA                         */}
      {/* ========================================================================= */}
      {isSuppliersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-card p-4 sm:p-6 max-w-4xl w-full shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-btn bg-theme-iconBg text-theme-iconColor flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-theme-textPrimary">Suppliers & Accounts Payable (Khata)</h3>
                  <p className="text-xs text-theme-textMuted">
                    Track supplier purchase histories, paid amounts, and outstanding payable balances.
                  </p>
                </div>
              </div>
              <button onClick={() => setIsSuppliersModalOpen(false)} className="text-theme-textMuted hover:text-theme-textPrimary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs">
              {suppliersLoading ? (
                <div className="py-12 text-center text-theme-textMuted">Loading suppliers summary...</div>
              ) : suppliersList.length === 0 ? (
                <div className="py-12 text-center text-theme-textMuted">No suppliers registered yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-theme-tableHeader text-[11px] font-bold text-theme-textMuted uppercase border-b border-theme-border">
                      <tr>
                        <th className="p-3">Supplier Name & Company</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3 text-center">Orders</th>
                        <th className="p-3 text-right">Total Purchases</th>
                        <th className="p-3 text-right">Total Paid</th>
                        <th className="p-3 text-right">Balance Due</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-border">
                      {suppliersList.map((sup) => (
                        <tr key={sup._id} className="hover:bg-theme-tableHover">
                          <td className="p-3 font-bold text-theme-textPrimary">
                            <div>{sup.name}</div>
                            {sup.companyName && <div className="text-[10px] text-theme-textMuted">{sup.companyName}</div>}
                          </td>
                          <td className="p-3 font-mono text-theme-textSecondary">{sup.phone || "—"}</td>
                          <td className="p-3 text-center font-bold">{sup.purchaseCount || 0}</td>
                          <td className="p-3 text-right font-mono font-bold text-theme-textPrimary">
                            {currency} {(sup.totalPurchases || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-600">
                            {currency} {(sup.totalPaid || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-mono font-black text-amber-600">
                            {currency} {(sup.balanceDue || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            {sup.balanceDue > 0 ? (
                              <button
                                type="button"
                                onClick={() => openSupplierPayModal(sup)}
                                className="px-3 py-1 rounded-btn bg-[#14532D] hover:bg-[#104323] text-white font-bold text-[11px] shadow-xs"
                              >
                                Pay Supplier
                              </button>
                            ) : (
                              <span className="text-emerald-600 font-bold text-[11px] flex items-center justify-center gap-1">
                                <Check className="w-3.5 h-3.5" /> All Cleared
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-theme-border">
              <button
                type="button"
                onClick={() => setIsSuppliersModalOpen(false)}
                className="px-4 py-2 rounded-btn bg-theme-surface border border-theme-border font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: RECORD SUPPLIER PAYMENT                                          */}
      {/* ========================================================================= */}
      {isSupplierPayModalOpen && selectedSupplierForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-card p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <h3 className="font-bold text-base text-theme-textPrimary flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" /> Pay Supplier
              </h3>
              <button onClick={() => setIsSupplierPayModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSupplierPaymentSubmit} className="space-y-3 text-xs font-semibold">
              <div className="p-3 rounded-card bg-theme-surface border border-theme-border">
                <div className="font-bold text-sm text-theme-textPrimary">{selectedSupplierForPay.name}</div>
                <div className="text-amber-600 font-black mt-1">
                  Outstanding Balance Due: {currency} {selectedSupplierForPay.balanceDue?.toLocaleString()}
                </div>
              </div>

              <div>
                <label className="text-theme-textSecondary block mb-1">Payment Amount ({currency}) *</label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  max={selectedSupplierForPay.balanceDue}
                  required
                  value={supplierPayAmount}
                  onChange={(e) => setSupplierPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input font-black text-emerald-600 text-sm"
                />
              </div>

              <div>
                <label className="text-theme-textSecondary block mb-1">Payment Method</label>
                <select
                  value={supplierPayMethod}
                  onChange={(e) => setSupplierPayMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input font-bold"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer / Online</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-theme-textSecondary block mb-1">Reference / Cheque #</label>
                <input
                  type="text"
                  value={supplierPayRef}
                  onChange={(e) => setSupplierPayRef(e.target.value)}
                  placeholder="e.g. TR-90218 or CHQ-001"
                  className="w-full px-3 py-1.5 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setIsSupplierPayModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-btn border border-theme-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={supplierPaySubmitting}
                  className="px-4 py-1.5 rounded-btn bg-[#14532D] hover:bg-[#104323] text-white font-bold shadow-card"
                >
                  {supplierPaySubmitting ? "Recording..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: STOCK ADJUSTMENT                                                 */}
      {/* ========================================================================= */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-card p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <h3 className="font-bold text-base text-theme-textPrimary flex items-center gap-2">
                <Sliders className="w-5 h-5 text-theme-primary" /> Stock Adjustment
              </h3>
              <button onClick={() => setIsStockModalOpen(false)} className="text-theme-textMuted hover:text-theme-textPrimary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockAdjustmentSubmit} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="text-theme-textSecondary block mb-1">Select Product *</label>
                <select
                  value={stockProduct?._id || ""}
                  onChange={(e) => {
                    const found = products.find((p) => p._id === e.target.value);
                    setStockProduct(found || null);
                  }}
                  required
                  className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input font-bold"
                >
                  <option value="">-- Choose Product to Adjust --</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.itemName} ({p.remaining} {p.unit || "pcs"} in stock)
                    </option>
                  ))}
                </select>
              </div>

              {stockProduct && (
                <>
                  <div>
                    <label className="text-theme-textSecondary block mb-1">Adjustment Action *</label>
                    <select
                      value={adjustmentType}
                      onChange={(e) => setAdjustmentType(e.target.value)}
                      className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input font-bold"
                    >
                      <option value="Restock / Addition">+ Restock / Add Stock (Increase)</option>
                      <option value="Damaged / Expired">- Damaged / Expired / Loss (Decrease)</option>
                      <option value="Audit Correction">= Set Physical Audit Count (Override)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-theme-textSecondary block mb-1">
                      {adjustmentType === "Audit Correction" ? "Physical Count in Hand *" : "Quantity to Adjust *"}
                    </label>
                    <input
                      type="number"
                      step={stockProduct.allowDecimal ? "any" : "1"}
                      min={adjustmentType === "Audit Correction" ? "0" : "0.001"}
                      required
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input font-bold text-base"
                    />
                  </div>

                  <div>
                    <label className="text-theme-textSecondary block mb-1">Reason for Adjustment</label>
                    <input
                      type="text"
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      placeholder="e.g. Broken packaging, physical count mismatch..."
                      className="w-full px-3 py-2 bg-theme-inputBg border border-theme-inputBorder rounded-input"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="px-4 py-2 rounded-btn border border-theme-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-btn bg-[#14532D] hover:bg-[#104323] text-white font-bold shadow-card"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: BARCODE STICKER LABEL GENERATOR                                  */}
      {/* ========================================================================= */}
      {isBarcodeModalOpen && barcodeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-card p-5 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <h3 className="font-bold text-base text-theme-textPrimary flex items-center gap-2">
                <Barcode className="w-5 h-5 text-theme-primary" /> Print Barcode Labels
              </h3>
              <button onClick={() => setIsBarcodeModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span>Label Count:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={barcodeCount}
                  onChange={(e) => setBarcodeCount(parseInt(e.target.value) || 1)}
                  className="w-20 px-2 py-1 bg-theme-inputBg border border-theme-inputBorder rounded-btn text-center font-bold"
                />
              </div>
              <button
                type="button"
                onClick={handlePrintBarcodes}
                className="px-4 py-1.5 rounded-btn bg-[#14532D] text-white font-bold flex items-center gap-1.5 shadow-card"
              >
                <Printer className="w-3.5 h-3.5" /> Print Now
              </button>
            </div>

            <div className="p-3 border border-theme-border rounded-card bg-theme-surface max-h-72 overflow-y-auto">
              <div id="barcode-labels-print-area" className="flex flex-wrap gap-2.5 justify-center">
                {Array.from({ length: barcodeCount }).map((_, idx) => (
                  <div key={idx} className="border border-theme-border p-2 rounded-btn bg-white text-slate-900 w-44 text-center shadow-xs">
                    <div className="text-[10px] font-bold uppercase truncate">{storeSettings?.storeName || "Bizniz POS"}</div>
                    <div className="text-[11px] font-black truncate">{barcodeProduct.itemName}</div>
                    <div className="my-1 flex justify-center">
                      <svg
                        className="h-9 w-full max-w-[130px]"
                        viewBox="0 0 100 30"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect x="2" y="0" width="3" height="30" fill="#000" />
                        <rect x="7" y="0" width="2" height="30" fill="#000" />
                        <rect x="11" y="0" width="4" height="30" fill="#000" />
                        <rect x="18" y="0" width="2" height="30" fill="#000" />
                        <rect x="23" y="0" width="3" height="30" fill="#000" />
                        <rect x="28" y="0" width="1" height="30" fill="#000" />
                        <rect x="32" y="0" width="4" height="30" fill="#000" />
                        <rect x="39" y="0" width="2" height="30" fill="#000" />
                        <rect x="44" y="0" width="5" height="30" fill="#000" />
                        <rect x="52" y="0" width="2" height="30" fill="#000" />
                        <rect x="57" y="0" width="3" height="30" fill="#000" />
                        <rect x="63" y="0" width="2" height="30" fill="#000" />
                        <rect x="68" y="0" width="4" height="30" fill="#000" />
                        <rect x="75" y="0" width="2" height="30" fill="#000" />
                        <rect x="80" y="0" width="3" height="30" fill="#000" />
                        <rect x="86" y="0" width="5" height="30" fill="#000" />
                        <rect x="94" y="0" width="2" height="30" fill="#000" />
                      </svg>
                    </div>
                    <div className="text-[10px] font-mono font-bold tracking-widest">{barcodeProduct.barcode || barcodeProduct.stockID}</div>
                    <div className="text-xs font-black mt-0.5">{currency} {barcodeProduct.salePrice || barcodeProduct.rate}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <ConfirmModal
          isOpen={Boolean(productToDelete)}
          onClose={() => setProductToDelete(null)}
          onConfirm={handleDeleteProduct}
          title="Delete Product"
          message={`Are you sure you want to permanently delete "${productToDelete.itemName}"? This action cannot be undone.`}
          confirmText="Delete Product"
          confirmColor="bg-rose-600 hover:bg-rose-700"
        />
      )}
    </div>
  );
}

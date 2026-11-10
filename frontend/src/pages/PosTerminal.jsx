import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  Calculator,
  User,
  CreditCard,
  Printer,
  PauseCircle,
  PlayCircle,
  CheckCircle,
  XCircle,
  ShoppingBag,
  Sparkles,
  Layers,
  LayoutGrid,
  List,
  UserPlus,
  RefreshCw,
  Share2,
  X,
  Lock,
  Edit3,
  Eye
} from "lucide-react";
import api from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import Receipt80mm from "../components/Receipt80mm";
import CustomerKhataProfileModal from "../components/CustomerKhataProfileModal";

// Helper to extract product name and variant/size cleanly for the POS Cart display
const parseCartItemDetails = (item) => {
  const rawName = item?.itemName || "";
  const explicitVariant = item?.variant || item?.size || (item?.qty && item.qty !== item.unit ? item.qty : "");
  
  if (explicitVariant && explicitVariant.trim() && explicitVariant !== rawName) {
    return {
      name: rawName.replace(explicitVariant, "").trim() || rawName,
      variant: explicitVariant.trim()
    };
  }

  // Regex to extract common supermarket size/variant patterns at end of itemName:
  // e.g. "1.5 Litre Bottle", "1.5L", "475g", "50g", "1 Litre", "1L", "500g", "1kg", "800ml"
  const regex = /^(.*?)\s+((?:\d+(?:\.\d+)?\s*(?:kg|g|gm|l|ltr|litre|liter|ml|oz|cl|pack|pcs|pc|bottle|can|sachet|tin)(?:\s+(?:bottle|can|pack|box|bag|tin))?)|(?:\d+\s*(?:Litre|Liter|Ltr|Bottle|Can|Pack)))$/i;
  const match = rawName.match(regex);
  if (match && match[1] && match[2]) {
    return {
      name: match[1].trim(),
      variant: match[2].trim()
    };
  }

  return {
    name: rawName,
    variant: ""
  };
};

export default function PosTerminal() {
  const navigate = useNavigate();
  const { storeSettings } = useTheme();
  const { showToast } = useToast();
  const { user } = useAuth();
  const currency = storeSettings?.currency || "PKR";

  // RBAC Permissions: Cost price visibility and price override
  const canViewCostPrice = user?.role === "admin" || user?.role === "superadmin" || user?.role === "manager";
  const canOverridePrice = user?.role === "admin" || user?.role === "superadmin" || user?.role === "manager";

  // Data states
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // POS Mode: 'hybrid' | 'barcode' | 'grid'
  const [posMode, setPosMode] = useState(storeSettings?.defaultPosMode || "hybrid");

  // Active Category Filter for picture grid
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [gridSearch, setGridSearch] = useState("");

  // Barcode / SKU Entry Bar State
  const [skuInput, setSkuInput] = useState("");
  const [skuQty, setSkuQty] = useState(1);
  const [skuRate, setSkuRate] = useState(0);
  const [skuDiscount, setSkuDiscount] = useState(0);
  const [skuTax, setSkuTax] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedPkgUnit, setSelectedPkgUnit] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Cart State
  const [cart, setCart] = useState([]);
  const [cartSearch, setCartSearch] = useState("");

  // Filtered Cart items for table display without affecting cart calculations
  const filteredCart = useMemo(() => {
    if (!cartSearch.trim()) {
      return cart.map((item, originalIndex) => ({ item, originalIndex }));
    }
    const query = cartSearch.toLowerCase().trim();
    return cart
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => {
        const name = (item.itemName || "").toLowerCase();
        const variant = (item.variant || item.size || "").toLowerCase();
        const barcode = (item.barcode || item.stockID || "").toLowerCase();
        return name.includes(query) || variant.includes(query) || barcode.includes(query);
      });
  }, [cart, cartSearch]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState("Regular");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [splitCash, setSplitCash] = useState(0);
  const [splitBank, setSplitBank] = useState(0);
  const [splitProvider, setSplitProvider] = useState("Card (POS Terminal)");
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(storeSettings?.taxRate || 0);
  const [cashReceived, setCashReceived] = useState(0);
  const [orderNotes, setOrderNotes] = useState("");
  const [recalledHeldBillId, setRecalledHeldBillId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isKhataProfileOpen, setIsKhataProfileOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustLimit, setNewCustLimit] = useState(50000);

  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [heldBills, setHeldBills] = useState([]);

  // Print Modal
  const [printedBill, setPrintedBill] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const printRef = useRef(null);
  const barcodeInputRef = useRef(null);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, custRes] = await Promise.all([
        api.get("/products", { params: { all: "true" } }),
        api.get("/ledger/customers")
      ]);

      if (prodRes.data.success) {
        setProducts(prodRes.data.products || []);
        setCategories(prodRes.data.categories || []);
      }
      if (custRes.data.success) {
        setCustomers(custRes.data.customers || []);
      }
    } catch (err) {
      showToast("Error loading catalog: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    barcodeInputRef.current?.focus();
  }, []);

  // Filtered Products for Picture Grid (Optimized with useMemo)
  const filteredGridProducts = useMemo(() => {
    let result = products;
    if (selectedCategory && selectedCategory !== "all") {
      result = result.filter(
        (p) => p.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    if (gridSearch.trim() !== "") {
      const q = gridSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.itemName?.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q) ||
          p.brandName?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, selectedCategory, gridSearch]);

  // Handle Barcode Search Dropdown
  const handleSkuSearch = (val) => {
    setSkuInput(val);
    setSelectedProduct(null);
    setSelectedPkgUnit(null);
    if (!val || val.trim().length === 0) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }
    const q = val.toLowerCase().trim();
    // Fast match on barcode, SKU, packaging unit barcode, or name
    const matches = products.filter(
      (p) =>
        p.barcode?.toLowerCase() === q ||
        p.stockID?.toLowerCase() === q ||
        p.sku?.toLowerCase() === q ||
        p.itemName?.toLowerCase().includes(q) ||
        p.packagingUnits?.some((u) => u.barcode && u.barcode.toLowerCase() === q)
    );
    setSearchResults(matches.slice(0, 8));
    setIsDropdownOpen(matches.length > 0);

    // Exact barcode match auto-select
    const exact = matches.find((p) => p.barcode?.toLowerCase() === q || p.stockID?.toLowerCase() === q);
    if (exact) {
      selectProductForEntry(exact);
    } else {
      for (const p of matches) {
        const foundUnit = p.packagingUnits?.find((u) => u.barcode && u.barcode.toLowerCase() === q);
        if (foundUnit) {
          selectProductForEntry(p, foundUnit);
          break;
        }
      }
    }
  };

  const selectProductForEntry = (product, pkgUnit = null) => {
    setSelectedProduct(product);
    setSelectedPkgUnit(pkgUnit);
    if (pkgUnit) {
      setSkuInput(`${product.itemName} [${pkgUnit.unitName}] (${pkgUnit.barcode || product.barcode || product.stockID})`);
      setSkuRate(pkgUnit.salePrice || product.salePrice || 0);
    } else {
      setSkuInput(`${product.itemName} (${product.barcode || product.stockID})`);
      setSkuRate(product.salePrice || product.rate || 0);
    }
    setIsDropdownOpen(false);
  };

  // Add Item to Cart from Barcode Entry Bar
  const addItemFromBar = () => {
    let prod = selectedProduct;
    let pkgUnit = selectedPkgUnit;

    if (!prod && skuInput.trim()) {
      const clean = skuInput.trim().toLowerCase();
      // 1. Exact match on barcode or stockID (standard for physical barcode scanners)
      prod = products.find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === clean) ||
          (p.stockID && p.stockID.toLowerCase() === clean)
      );
      // 1b. Check packaging unit barcode
      if (!prod) {
        for (const p of products) {
          if (p.packagingUnits && Array.isArray(p.packagingUnits)) {
            const foundUnit = p.packagingUnits.find(
              (u) => u.barcode && u.barcode.toLowerCase() === clean
            );
            if (foundUnit) {
              prod = p;
              pkgUnit = foundUnit;
              break;
            }
          }
        }
      }
      // 2. First search result if open
      if (!prod && searchResults.length > 0) {
        prod = searchResults[0];
      }
      // 3. Fallback to name match
      if (!prod) {
        prod = products.find((p) => p.itemName && p.itemName.toLowerCase().includes(clean));
      }
    }

    if (!prod) {
      showToast("No matching product found for scan/search.", "error");
      return;
    }

    const parsedQty = parseFloat(skuQty);
    const qty = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 1;
    const rate = skuRate > 0
      ? skuRate
      : (pkgUnit?.salePrice ? pkgUnit.salePrice : (prod.salePrice || prod.rate || 0));

    const totalBaseNeeded = qty * (pkgUnit?.conversionFactor || 1);
    if (totalBaseNeeded > prod.remaining) {
      showToast(`Warning: Only ${prod.remaining} ${prod.unit || 'pcs'} in stock!`, "info");
    }

    addItemToCart(prod, qty, rate, skuDiscount, skuTax, pkgUnit);
    resetEntryBar();
  };

  const resetEntryBar = () => {
    setSkuInput("");
    setSkuQty(1);
    setSkuRate(0);
    setSkuDiscount(0);
    setSkuTax(0);
    setSelectedProduct(null);
    setSelectedPkgUnit(null);
    setSearchResults([]);
    setIsDropdownOpen(false);
    barcodeInputRef.current?.focus();
  };

  // Core Add to Cart logic
  const addItemToCart = (product, qty = 1, customRate = null, unitDiscount = 0, unitTax = 0, pkgUnit = null) => {
    if (!product) return;

    if (product.remaining <= 0) {
      showToast(`Cannot sell "${product.itemName}" - Product is out of stock!`, "error");
      return;
    }

    const activeUnit = pkgUnit ? pkgUnit.unitName : (product.unit || "pcs");
    const activeFactor = pkgUnit ? (parseFloat(pkgUnit.conversionFactor) || 1) : 1;
    const baseCost = (product.costPrice !== undefined && product.costPrice !== null && !isNaN(product.costPrice)) ? Number(product.costPrice) : 0;
    const activeCost = (pkgUnit && pkgUnit.costPrice > 0) ? Number(pkgUnit.costPrice) : (baseCost * activeFactor);
    const defaultProductRate = pkgUnit?.salePrice ? pkgUnit.salePrice : (product.salePrice || product.rate || 0);
    const rate = customRate !== null ? customRate : defaultProductRate;
    const isOverridden = Math.abs(rate - defaultProductRate) > 0.001;
    const parsedQty = parseFloat(qty);
    const numQty = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 1;

    // Check available stock in base units
    const existingInCart = cart.find(
      (item) => item.stockID === product.stockID && item.unit === activeUnit
    );
    const currentCartQty = existingInCart ? existingInCart.quantity : 0;
    const requestedTotalBase = (currentCartQty + numQty) * activeFactor;

    if (requestedTotalBase > (product.remaining || 0)) {
      showToast(
        `Cannot add: Requested total (${requestedTotalBase} ${product.unit || "pcs"}) exceeds available stock (${product.remaining || 0} ${product.unit || "pcs"})!`,
        "error"
      );
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((item) => item.stockID === product.stockID && item.unit === activeUnit);
      if (idx > -1) {
        const updated = [...prev];
        const newQty = Math.round((updated[idx].quantity + numQty) * 1000) / 1000;
        updated[idx] = {
          ...updated[idx],
          quantity: newQty,
          lineTotal: Math.round((newQty * rate - (updated[idx].unitDiscount * newQty) + (updated[idx].unitTax * newQty)) * 100) / 100
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            _id: product._id,
            stockID: product.stockID,
            barcode: pkgUnit?.barcode || product.barcode || product.stockID,
            itemName: product.itemName,
            brandName: product.brandName || "General",
            category: product.category || "General",
            variant: product.variant || product.colourName || product.qty || "",
            size: product.size || "",
            baseUnit: product.unit || "pcs",
            unit: activeUnit,
            conversionFactor: activeFactor,
            costPrice: canViewCostPrice ? activeCost : 0,
            rate: rate,
            originalRate: defaultProductRate,
            isPriceOverridden: isOverridden,
            quantity: numQty,
            unitDiscount: parseFloat(unitDiscount) || 0,
            unitTax: parseFloat(unitTax) || 0,
            lineTotal: Math.round((numQty * rate - (unitDiscount * numQty) + (unitTax * numQty)) * 100) / 100,
            packagingUnits: product.packagingUnits || []
          }
        ];
      }
    });

    showToast(`Added ${numQty} ${activeUnit} of ${product.itemName}`, "success", 2000);
  };

  // Editable Selling Price with RBAC enforcement
  const updateCartRate = (idx, newRate) => {
    if (!canOverridePrice) {
      showToast("Access denied: Only Admin or Manager can override selling prices.", "error");
      return;
    }
    const val = parseFloat(newRate);
    if (isNaN(val) || val <= 0) {
      showToast("Please enter a valid positive price.", "error");
      return;
    }
    const item = cart[idx];
    if (!item) return;

    if (item.costPrice > 0 && val < item.costPrice && user?.role !== "admin" && user?.role !== "superadmin") {
      showToast(`Warning: Cannot sell below cost price (${currency} ${item.costPrice}) without Super Admin authorization!`, "error");
      return;
    }

    setCart((prev) => {
      const updated = [...prev];
      const cur = updated[idx];
      const origRate = cur.originalRate !== undefined ? cur.originalRate : cur.rate;
      const isOverridden = Math.abs(val - origRate) > 0.001;

      updated[idx] = {
        ...cur,
        rate: val,
        originalRate: origRate,
        isPriceOverridden: isOverridden,
        lineTotal: Math.round((cur.quantity * val - (cur.unitDiscount * cur.quantity) + (cur.unitTax * cur.quantity)) * 100) / 100
      };
      return updated;
    });
  };

  const switchCartItemUnit = (idx, newUnitName) => {
    setCart((prev) => {
      if (!prev[idx]) return prev;
      const item = prev[idx];
      const updated = [...prev];
      if (newUnitName === item.baseUnit) {
        const prod = products.find((p) => p.stockID === item.stockID);
        const baseRate = prod?.salePrice || prod?.rate || item.rate;
        const baseCost = prod?.costPrice || 0;
        updated[idx] = {
          ...item,
          unit: item.baseUnit,
          conversionFactor: 1,
          costPrice: baseCost,
          rate: baseRate,
          barcode: prod?.barcode || item.stockID,
          lineTotal: Math.round((item.quantity * baseRate - (item.unitDiscount * item.quantity) + (item.unitTax * item.quantity)) * 100) / 100
        };
      } else {
        const pkgUnit = item.packagingUnits?.find((u) => u.unitName === newUnitName);
        if (pkgUnit) {
          const factor = parseFloat(pkgUnit.conversionFactor) || 1;
          const pkgRate = pkgUnit.salePrice || (item.rate * factor);
          const pkgCost = (pkgUnit.costPrice > 0) ? Number(pkgUnit.costPrice) : (item.costPrice * factor);
          updated[idx] = {
            ...item,
            unit: pkgUnit.unitName,
            conversionFactor: factor,
            costPrice: pkgCost,
            rate: pkgRate,
            barcode: pkgUnit.barcode || item.barcode,
            lineTotal: Math.round((item.quantity * pkgRate - (item.unitDiscount * item.quantity) + (item.unitTax * item.quantity)) * 100) / 100
          };
        }
      }
      return updated;
    });
  };

  // Cart manipulation
  const updateCartQty = (idx, newQty) => {
    const qty = parseFloat(newQty);
    if (isNaN(qty) || qty <= 0) {
      removeCartItem(idx);
      return;
    }
    const item = cart[idx];
    if (item) {
      const prod = products.find((p) => p.stockID === item.stockID);
      if (prod) {
        const factor = item.conversionFactor || 1;
        const totalBase = qty * factor;
        if (totalBase > (prod.remaining || 0)) {
          showToast(`Cannot set quantity: Only ${prod.remaining} ${prod.unit || 'pcs'} available in stock!`, "error");
          return;
        }
      }
    }
    setCart((prev) => {
      const updated = [...prev];
      updated[idx].quantity = qty;
      updated[idx].lineTotal = Math.round((qty * updated[idx].rate - (updated[idx].unitDiscount * qty) + (updated[idx].unitTax * qty)) * 100) / 100;
      return updated;
    });
  };

  const removeCartItem = (idx) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearCart = () => {
    setCart([]);
    setCartSearch("");
    setCustomerName("Walk-in Customer");
    setSelectedCustomerId("");
    setCustomerPhone("");
    setCashReceived(0);
    setOverallDiscount(0);
    setOrderNotes("");
    setRecalledHeldBillId(null);
    showToast("Cart cleared.", "info");
    barcodeInputRef.current?.focus();
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.lineTotal, 0);
  }, [cart]);

  const taxAmount = useMemo(() => {
    return (subtotal * (parseFloat(taxPercent) || 0)) / 100;
  }, [subtotal, taxPercent]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal + taxAmount - (parseFloat(overallDiscount) || 0));
  }, [subtotal, taxAmount, overallDiscount]);

  const changeDue = useMemo(() => {
    const received = parseFloat(cashReceived) || 0;
    if (received >= grandTotal) {
      return received - grandTotal;
    }
    return 0;
  }, [cashReceived, grandTotal]);

  const balanceDue = useMemo(() => {
    const received = parseFloat(cashReceived) || 0;
    if (received < grandTotal) {
      return grandTotal - received;
    }
    return 0;
  }, [cashReceived, grandTotal]);

  // Cash preset calculator helper
  const handleCashPreset = (type) => {
    if (type === "exact") {
      setCashReceived(Math.ceil(grandTotal));
    } else if (typeof type === "number") {
      setCashReceived(type);
    } else if (typeof type === "string" && type.startsWith("+")) {
      const addVal = parseFloat(type.replace("+", "")) || 0;
      setCashReceived((prev) => {
        const base = parseFloat(prev) || (grandTotal > 0 ? Math.ceil(grandTotal) : 0);
        return base + addVal;
      });
    }
  };

  // Select Khata Customer
  const handleSelectCustomer = (custId) => {
    setSelectedCustomerId(custId);
    const found = customers.find((c) => c._id === custId);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone || "");
    } else {
      setCustomerName("Walk-in Customer");
      setCustomerPhone("");
    }
  };

  // Create Quick Customer
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      showToast("Customer name is required", "error");
      return;
    }
    try {
      const res = await api.post("/ledger/customers", {
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        creditLimit: newCustLimit
      });
      if (res.data.success && res.data.customer) {
        showToast("Customer created successfully!", "success");
        setCustomers((prev) => [...prev, res.data.customer]);
        setSelectedCustomerId(res.data.customer._id);
        setCustomerName(res.data.customer.name);
        setCustomerPhone(res.data.customer.phone || "");
        setIsCustomerModalOpen(false);
        setNewCustName("");
        setNewCustPhone("");
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
    }
  };

  // Submit Order / Checkout (with Double-Submit Lock & Idempotency Key)
  const handleProcessSale = async (status = "Completed", autoPrint = true) => {
    if (isSubmitting) return;
    if (cart.length === 0) {
      showToast("Cart is empty! Add products before checking out.", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const idempotencyKey = `pos_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      let effectiveCashReceived = 0;
      if (paymentMethod === "Split Payment") {
        effectiveCashReceived = parseFloat(splitCash) || 0;
      } else if (paymentMethod === "AR Khata / Credit") {
        effectiveCashReceived = parseFloat(cashReceived) || 0;
      } else {
        effectiveCashReceived = parseFloat(cashReceived) > 0 ? parseFloat(cashReceived) : grandTotal;
      }

      const payload = {
        idempotencyKey,
        sales: cart.map((it) => ({
          stockID: it.stockID,
          barcode: it.barcode,
          quantitySold: it.quantity,
          unit: it.unit,
          conversionFactor: it.conversionFactor || 1,
          costPrice: it.costPrice,
          rate: it.rate,
          originalRate: it.originalRate !== undefined ? it.originalRate : it.rate,
          isPriceOverridden: Boolean(it.isPriceOverridden),
          unitTax: it.unitTax,
          unitDiscount: it.unitDiscount
        })),
        customerName: (customerName && customerName.trim()) ? customerName.trim() : "Walk-in Customer",
        customerPhone: (customerPhone && customerPhone.trim()) ? customerPhone.trim() : "",
        customerId: selectedCustomerId || null,
        branchId: null,
        orderType,
        status,
        paymentMethod: paymentMethod === "Split Payment" ? "Split Payment" : paymentMethod,
        splitPayment: paymentMethod === "Split Payment" ? {
          isSplit: true,
          cashAmount: parseFloat(splitCash) || 0,
          bankAmount: parseFloat(splitBank) || 0,
          bankProvider: splitProvider
        } : null,
        subtotal,
        taxAmount,
        discountAmount: overallDiscount,
        cashReceived: effectiveCashReceived,
        changeDue: paymentMethod === "Split Payment" ? 0 : changeDue,
        notes: orderNotes,
        heldBillId: recalledHeldBillId || null
      };

      const res = await api.post("/sales", payload);
      if (res.data.success) {
        showToast(`Sale completed! Invoice #${res.data.billID}`, "success");
        setPrintedBill(res.data.bill);
        setRecalledHeldBillId(null);

        // Fetch refreshed product stock in background
        fetchData();

        if (autoPrint) {
          setIsPrintModalOpen(true);
        }

        // Reset Cart
        clearCart();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to process sale", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hold Bill
  const handleHoldBill = async () => {
    if (isSubmitting) return;
    if (cart.length === 0) {
      showToast("Cannot hold an empty cart.", "error");
      return;
    }
    await handleProcessSale("Held", false);
  };

  // Recall Held Bills
  const fetchHeldBills = async () => {
    try {
      const res = await api.get("/sales/held-bills");
      if (res.data.success) {
        setHeldBills(res.data.heldBills || []);
        setIsHeldModalOpen(true);
      }
    } catch (err) {
      showToast("Could not load held bills", "error");
    }
  };

  const recallBill = (bill) => {
    const recalledCart = (bill.salesItems || []).map((s) => ({
      _id: s._id,
      stockID: s.stockID,
      barcode: s.barcode || s.stockID,
      itemName: s.itemName,
      brandName: s.brandName,
      unit: s.unit || "pcs",
      rate: s.rate,
      quantity: s.quantitySold || 1,
      unitDiscount: s.unitDiscount || 0,
      unitTax: s.unitTax || 0,
      lineTotal: (s.quantitySold || 1) * s.rate
    }));

    setCart(recalledCart);
    setCustomerName(bill.customerName || "Walk-in Customer");
    setCustomerPhone(bill.customerPhone || "");
    setPaymentMethod(bill.paymentMethod || "Cash");
    setOverallDiscount(bill.discountAmount || 0);
    setRecalledHeldBillId(bill._id);
    setIsHeldModalOpen(false);
    showToast(`Bill #${bill.billID} recalled to cart!`, "success");
  };

  // Global Keyboard Shortcuts (F1 - F10)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent shortcut execution if currently submitting checkout
      if (isSubmitting) return;

      // F1: New Sale / Clear Cart
      if (e.key === "F1") {
        e.preventDefault();
        clearCart();
      }
      // F3: Apply Payment & Print
      else if (e.key === "F3") {
        e.preventDefault();
        handleProcessSale("Completed", true);
      }
      // F4: Save & Continue
      else if (e.key === "F4") {
        e.preventDefault();
        handleProcessSale("Completed", false);
      }
      // F5: Save & Return
      else if (e.key === "F5") {
        e.preventDefault();
        handleProcessSale("Completed", true).then(() => {
          navigate("/orders");
        });
      }
      // F6: Convert to AR Khata
      else if (e.key === "F6") {
        e.preventDefault();
        setPaymentMethod("AR Khata / Credit");
        showToast("Switched payment method to AR Khata / Credit", "info");
      }
      // F7: Hold Bill
      else if (e.key === "F7") {
        e.preventDefault();
        handleHoldBill();
      }
      // F8: Recall Held Bills
      else if (e.key === "F8") {
        e.preventDefault();
        fetchHeldBills();
      }
      // F10: Void Sale
      else if (e.key === "F10") {
        e.preventDefault();
        clearCart();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, grandTotal, cashReceived, customerName, isSubmitting]);

  const handleShareWhatsApp = (bill) => {
    if (!bill) return;
    const store = storeSettings?.storeName || "Universal Super Mart & POS";
    const phone = bill.customerPhone ? bill.customerPhone.replace(/[^0-9]/g, "") : "";
    const cleanPhone = phone.startsWith("0") ? "92" + phone.slice(1) : phone;

    const itemsText = (bill.salesItems || [])
      .map(
        (it) =>
          `• ${it.itemName} (${(it.quantitySold || it.quantity || 1) - (it.refundQuantity || 0)} ${it.unit || "pcs"} @ PKR ${it.rate}) = PKR ${(((it.quantitySold || it.quantity || 1) - (it.refundQuantity || 0)) * (it.rate || 0)).toLocaleString()}`
      )
      .join("\n");

    const message =
      `🧾 *SALE RECEIPT / INVOICE*\n` +
      `🏪 *${store}*\n` +
      `--------------------------------\n` +
      `*Bill #:* ${bill.billID}\n` +
      `*Date:* ${bill.formattedDate || new Date(bill.createdAt).toLocaleDateString()} (${bill.formattedTime || ""})\n` +
      `*Customer:* ${bill.customerName || "Valued Shopper"}\n` +
      `--------------------------------\n` +
      `*PURCHASED ITEMS:*\n${itemsText || "• General items"}\n` +
      `--------------------------------\n` +
      `*GRAND TOTAL:* PKR ${(bill.grandTotal || 0).toLocaleString()}\n` +
      `*Payment Method:* ${bill.paymentMethod || "Cash"}\n` +
      `--------------------------------\n` +
      `_Thank you for your purchase! Visit again soon._`;

    const encoded = encodeURIComponent(message);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(waUrl, "_blank");
  };

  return (
    <div className="space-y-2.5 pb-16">
      {/* 1. COMPACT TOP CONTROLS & DUAL-MODE SWITCHER */}
      <div className="bg-theme-card border border-theme-border rounded-xl px-3 py-2 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <Calculator className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-sm sm:text-base text-theme-textPrimary leading-none">
              Retail POS Terminal
            </h1>
            <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-bold bg-black/5 dark:bg-white/5 text-theme-textSecondary">
              {user?.name || "Cashier"} ({user?.role || "Staff"})
            </span>
            {canOverridePrice && (
              <span className="hidden md:inline-block text-[10px] px-1.5 py-0.2 rounded font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                Price Override Active
              </span>
            )}
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-0.5 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setPosMode("hybrid")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
              posMode === "hybrid"
                ? "bg-theme-primary text-white shadow-xs"
                : "text-theme-textSecondary hover:text-theme-textPrimary"
            }`}
          >
            <Layers className="w-3 h-3" />
            <span className="hidden sm:inline">Split Hybrid</span>
          </button>
          <button
            onClick={() => setPosMode("barcode")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
              posMode === "barcode"
                ? "bg-theme-primary text-white shadow-xs"
                : "text-theme-textSecondary hover:text-theme-textPrimary"
            }`}
          >
            <Barcode className="w-3 h-3" />
            <span className="hidden sm:inline">Barcode Mode</span>
          </button>
          <button
            onClick={() => setPosMode("grid")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
              posMode === "grid"
                ? "bg-theme-primary text-white shadow-xs"
                : "text-theme-textSecondary hover:text-theme-textPrimary"
            }`}
          >
            <LayoutGrid className="w-3 h-3" />
            <span className="hidden sm:inline">Picture Grid</span>
          </button>
        </div>
      </div>

      {/* 2. COMPACT BARCODE & SKU SCANNER ROW */}
      <div className="bg-theme-card border border-theme-border rounded-xl p-2 sm:p-2.5 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
          {/* Quantity */}
          <div className="md:col-span-1">
            <label className="text-[10px] font-bold text-theme-textMuted uppercase mb-0.5 block">
              Qty
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              value={skuQty}
              onChange={(e) => setSkuQty(e.target.value)}
              className="w-full px-2 py-1 text-xs font-bold text-center bg-black/5 dark:bg-white/5 border border-theme-border rounded-lg focus:ring-1 focus:ring-theme-primary focus:outline-none"
            />
          </div>

          {/* Barcode / SKU / Name Search with Dropdown */}
          <div className="md:col-span-6 relative">
            <label className="text-[10px] font-bold text-theme-textMuted uppercase mb-0.5 block">
              Scan Barcode / SKU / Product Name
            </label>
            <div className="relative">
              <Barcode className="w-3.5 h-3.5 absolute left-2.5 top-2 text-theme-textMuted" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={skuInput}
                onChange={(e) => handleSkuSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItemFromBar();
                  }
                }}
                placeholder="Scan Barcode or type item name..."
                className="w-full pl-8 pr-3 py-1 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-lg focus:ring-1 focus:ring-theme-primary focus:outline-none"
              />
            </div>

            {/* Live Autocomplete Results */}
            {isDropdownOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-theme-card border border-theme-border rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
                {searchResults.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => selectProductForEntry(p)}
                    className="w-full px-3.5 py-2 text-left hover:bg-theme-primary/10 flex items-center justify-between border-b border-theme-border last:border-b-0 transition cursor-pointer"
                  >
                    <div className="flex-1 pr-3">
                      <div className="font-bold text-xs sm:text-sm text-theme-textPrimary leading-snug break-words">
                        {p.itemName}
                      </div>
                      <div className="text-[11px] text-theme-textMuted flex items-center gap-2 mt-0.5">
                        <span>Barcode: {p.barcode || p.stockID}</span>
                        <span>•</span>
                        <span>Stock: <strong className="text-theme-textPrimary font-mono">{p.remaining} {p.unit || 'pcs'}</strong></span>
                        {p.category && (
                          <>
                            <span>•</span>
                            <span className="text-[10px] px-1 py-0.2 rounded bg-black/5 dark:bg-white/5">{p.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="font-black text-xs sm:text-sm text-theme-primary whitespace-nowrap">
                      {currency} {(p.salePrice || p.rate || 0).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Unit Price Rate */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-[10px] font-bold text-theme-textMuted uppercase block">
                Rate ({currency})
              </label>
              {selectedProduct?.packagingUnits?.length > 0 && (
                <select
                  value={selectedPkgUnit ? selectedPkgUnit.unitName : (selectedProduct.unit || 'pcs')}
                  onChange={(e) => {
                    const uName = e.target.value;
                    if (uName === (selectedProduct.unit || 'pcs')) {
                      setSelectedPkgUnit(null);
                      setSkuRate(selectedProduct.salePrice || selectedProduct.rate || 0);
                    } else {
                      const pu = selectedProduct.packagingUnits.find(u => u.unitName === uName);
                      if (pu) {
                        setSelectedPkgUnit(pu);
                        setSkuRate(pu.salePrice || ((selectedProduct.salePrice || 0) * (pu.conversionFactor || 1)));
                      }
                    }
                  }}
                  className="text-[9px] font-bold bg-theme-primary/10 text-theme-primary border border-theme-primary/30 rounded px-1 py-0.2 focus:outline-none cursor-pointer"
                  title="Select Packaging Unit"
                >
                  <option value={selectedProduct.unit || 'pcs'}>{selectedProduct.unit || 'pcs'} (1x)</option>
                  {selectedProduct.packagingUnits.map((u, i) => (
                    <option key={i} value={u.unitName}>{u.unitName} ({u.conversionFactor}x)</option>
                  ))}
                </select>
              )}
            </div>
            <input
              type="number"
              step="any"
              value={skuRate}
              onChange={(e) => setSkuRate(parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-xs font-bold text-right bg-black/5 dark:bg-white/5 border border-theme-border rounded-lg focus:ring-1 focus:ring-theme-primary focus:outline-none"
            />
          </div>

          {/* Highlighted Total Box */}
          <div className="md:col-span-3 flex items-center gap-1.5">
            <div className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg px-2.5 py-1 text-right shadow-xs">
              <span className="text-[9px] font-bold uppercase tracking-wider block opacity-90 leading-tight">
                Item Total
              </span>
              <span className="text-sm font-black leading-tight">
                {currency} {(skuQty * skuRate).toFixed(0)}
              </span>
            </div>

            <button
              type="button"
              onClick={addItemFromBar}
              className="h-8 px-3 rounded-lg bg-theme-primary hover:bg-theme-dark text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
              title="Add Item (Enter)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. WORKSPACE AREA: Compact Grid Catalog + Itemized Billing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3">
        {/* LEFT COLUMN: Picture Grid Catalog (shown in 'hybrid' and 'grid' modes) */}
        {(posMode === "hybrid" || posMode === "grid") && (
          <div
            className={`space-y-2 ${
              posMode === "grid" ? "lg:col-span-8 xl:col-span-8 2xl:col-span-9" : "lg:col-span-8 xl:col-span-8 2xl:col-span-8"
            }`}
          >
            {/* Category Scroll Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === "all"
                    ? "bg-theme-primary text-white shadow-xs"
                    : "bg-theme-card border border-theme-border text-theme-textSecondary hover:bg-black/5"
                }`}
              >
                All ({products.length})
              </button>
              {categories.map((cat, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-theme-primary text-white shadow-xs"
                      : "bg-theme-card border border-theme-border text-theme-textSecondary hover:bg-black/5"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Catalog Grid Cards — Exactly 7 cards per row on desktop layout */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 xl:grid-cols-7 2xl:grid-cols-7 gap-[2px] sm:gap-1 max-h-[calc(100vh-215px)] overflow-y-auto pr-0.5 p-[1px]">
              {filteredGridProducts.length === 0 ? (
                <div className="col-span-full py-12 text-center text-xs text-theme-textMuted bg-theme-card border border-theme-border rounded-[12px]">
                  No products found in this category.
                </div>
              ) : (
                filteredGridProducts.map((p) => {
                  const isOutOfStock = p.remaining <= 0;
                  return (
                    <div
                      key={p._id}
                      onClick={() => !isOutOfStock && addItemToCart(p, 1)}
                      className={`group relative bg-theme-card border border-theme-border hover:border-emerald-500/50 rounded-[10px] py-1 px-1.5 shadow-[0_1px_4px_rgba(15,23,42,0.05)] hover:shadow-[0_3px_8px_rgba(15,23,42,0.09)] transition-all duration-150 flex flex-col justify-between select-none h-[115px] max-w-[128px] w-full mx-auto ${
                        isOutOfStock ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                      }`}
                    >
                      {/* Top Section */}
                      <div className="flex flex-col">
                        {/* 1. Product Image Container */}
                        <div className="relative w-full h-[47px] rounded-md bg-black/5 dark:bg-white/5 overflow-hidden flex items-center justify-center p-0 m-0">
                          <img
                            src={p.image || "/images/product-placeholder.svg"}
                            alt={p.itemName}
                            className="w-[95%] h-[95%] object-contain p-0 m-0 group-hover:scale-105 transition-transform duration-150"
                            onError={(e) => {
                              e.target.src = "/images/product-placeholder.svg";
                            }}
                          />
                          {isOutOfStock && (
                            <div className="absolute inset-0 bg-slate-900/65 backdrop-blur-[1px] flex items-center justify-center text-white text-[7px] font-medium uppercase tracking-wider rounded-md">
                              Out of Stock
                            </div>
                          )}
                        </div>

                        {/* 2. Selling Price Directly Below Image (8px, normal weight 400) */}
                        <div className="flex items-center justify-between gap-1 leading-none mt-1">
                          <span className="text-[8px] font-normal text-emerald-600 dark:text-emerald-400 tracking-tight">
                            {currency} {(p.salePrice || p.rate || 0).toLocaleString()}
                          </span>
                          {p.packagingUnits?.length > 0 && (
                            <span className="text-[6.5px] px-1 py-0.2 rounded font-normal bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 whitespace-nowrap">
                              +{p.packagingUnits.length}u
                            </span>
                          )}
                        </div>

                        {/* 3. Product Name (improved visibility, 8.5px, normal weight 400) */}
                        <h4
                          className="text-[8.5px] font-normal text-slate-900 dark:text-slate-50 leading-[10.5px] break-words mt-0.5"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            height: "20px",
                            minHeight: "20px",
                            maxHeight: "20px"
                          }}
                          title={p.itemName}
                        >
                          {p.itemName}
                        </h4>
                      </div>

                      {/* 4. Stock Quantity/Unit (improved visibility, 8px, normal weight 400) and Add-to-Cart Button on ONE line */}
                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-theme-border/60 leading-none">
                        <span className="text-[8px] font-normal text-theme-textSecondary font-mono truncate">
                          {p.remaining} {p.unit || "pcs"}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addItemToCart(p, 1);
                          }}
                          disabled={isOutOfStock}
                          className="w-5 h-5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-90 text-white flex items-center justify-center shadow-2xs transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Add to Cart"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: Itemized Cart Table + Order Totals */}
        <div
          className={`space-y-2.5 ${
            posMode === "barcode"
              ? "lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-3"
              : posMode === "grid"
              ? "lg:col-span-4 xl:col-span-4 2xl:col-span-3"
              : "lg:col-span-4 xl:col-span-4 2xl:col-span-4"
          }`}
        >
          {/* Itemized Cart Table */}
          <div
            className={`bg-theme-card border border-theme-border rounded-xl shadow-xs overflow-hidden flex flex-col ${
              posMode === "barcode" ? "lg:col-span-8" : "w-full"
            }`}
          >
            {/* Cart Header */}
            <div className="p-2.5 px-3 border-b border-theme-border flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ShoppingBag className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xs text-theme-textPrimary">Current Sale Cart</h3>
                  <span className="text-[10px] font-bold text-theme-textSecondary bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-full">
                    {cart.length}
                  </span>
                </div>
                {recalledHeldBillId && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 flex items-center gap-1 animate-pulse">
                    <PauseCircle className="w-2.5 h-2.5" /> Parked
                  </span>
                )}
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 px-2 py-0.5 rounded-md transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {/* 1. Character-Based Product Search Input */}
            {cart.length > 0 && (
              <div className="px-2.5 py-1.5 border-b border-theme-border/50 bg-black/[0.02] dark:bg-white/[0.02] flex items-center gap-1.5 flex-shrink-0">
                <div className="relative flex-1 flex items-center">
                  <Search className="w-3.5 h-3.5 absolute left-2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={cartSearch}
                    onChange={(e) => setCartSearch(e.target.value)}
                    placeholder="Search in cart by product name..."
                    className="w-full pl-7 pr-6 py-1 text-xs bg-black/5 dark:bg-white/5 border border-theme-border/50 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition font-normal"
                  />
                  {cartSearch && (
                    <button
                      type="button"
                      onClick={() => setCartSearch("")}
                      className="absolute right-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {cartSearch && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium">
                    {filteredCart.length} of {cart.length}
                  </span>
                )}
              </div>
            )}

            {/* Cart Items List - Independently scrollable */}
            <div className="overflow-x-auto max-h-[35vh] sm:max-h-[38vh] overflow-y-auto scrollbar-thin">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-black/5 dark:bg-white/5 text-[9px] font-normal text-theme-textSecondary uppercase tracking-wider sticky top-0 z-10 border-b border-theme-border shadow-2xs">
                  <tr>
                    <th className="py-1.5 px-2.5 text-left">Item</th>
                    {canViewCostPrice && (
                      <th className="py-1.5 px-2 text-right" title="Purchase Cost Price (Visible to Admin/Manager)">
                        Cost
                      </th>
                    )}
                    <th className="py-1.5 px-2 text-right" title="Selling Price (Editable by Admin/Manager)">
                      Rate
                    </th>
                    <th className="py-1.5 px-1 text-center w-20">Qty</th>
                    <th className="py-1.5 px-2 text-right w-18">Total</th>
                    <th className="py-1.5 px-1 text-center w-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={canViewCostPrice ? 6 : 5} className="py-8 text-center text-slate-500 dark:text-slate-400 text-[11px] font-normal">
                        <ShoppingBag className="w-6 h-6 mx-auto mb-1 text-slate-400 opacity-40" />
                        Cart is empty. Scan barcode or click items to add.
                      </td>
                    </tr>
                  ) : filteredCart.length === 0 ? (
                    <tr>
                      <td colSpan={canViewCostPrice ? 6 : 5} className="py-6 text-center text-slate-500 dark:text-slate-400 text-[11px] font-normal">
                        <p>No cart items matching &quot;{cartSearch}&quot;</p>
                        <button
                          type="button"
                          onClick={() => setCartSearch("")}
                          className="mt-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[10.5px] hover:underline cursor-pointer"
                        >
                          Show all ({cart.length}) items
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredCart.map(({ item, originalIndex }) => {
                      const details = parseCartItemDetails(item);
                      return (
                        <tr key={originalIndex} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors">
                          {/* Item Details */}
                          <td className="py-1 px-2.5">
                            <div className="flex flex-col min-w-0">
                              {/* Line 1: Product Name */}
                              <div
                                className="font-normal text-[11px] text-slate-900 dark:text-slate-100 leading-tight truncate"
                                title={item.itemName}
                              >
                                {details.name || item.itemName}
                              </div>

                              {/* Line 2: Variant / Size, Unit, Barcode */}
                              <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[9px] text-slate-600 dark:text-slate-300 mt-0.5 leading-none font-mono">
                                {details.variant && (
                                  <span className="text-slate-800 dark:text-slate-200 font-normal">
                                    {details.variant}
                                  </span>
                                )}
                                {details.variant && <span className="text-slate-400 dark:text-slate-500 font-sans text-[8px]">•</span>}

                                {/* Unit / Packaging switcher */}
                                {item.packagingUnits && item.packagingUnits.length > 0 ? (
                                  <select
                                    value={item.unit}
                                    onChange={(e) => switchCartItemUnit(originalIndex, e.target.value)}
                                    className="text-[8.5px] font-normal bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 rounded px-1 py-0.2 focus:outline-none cursor-pointer"
                                    title="Switch packaging unit"
                                  >
                                    <option value={item.baseUnit}>{item.baseUnit} (1x)</option>
                                    {item.packagingUnits.map((u, pIdx) => (
                                      <option key={pIdx} value={u.unitName}>
                                        {u.unitName} ({u.conversionFactor}x)
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-slate-700 dark:text-slate-300">
                                    {item.unit}
                                  </span>
                                )}

                                {(item.barcode || item.stockID) && (
                                  <>
                                    <span className="text-slate-400 dark:text-slate-500 font-sans text-[8px]">•</span>
                                    <span className="text-slate-600 dark:text-slate-400">
                                      {item.barcode || item.stockID}
                                    </span>
                                  </>
                                )}

                                {item.conversionFactor > 1 && (
                                  <span className="text-amber-700 dark:text-amber-400 font-normal">
                                    ({item.conversionFactor}x)
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Purchase Price (Cost) - Visible only to Admin/Manager */}
                          {canViewCostPrice && (
                            <td className="py-1 px-2 text-right font-mono text-[9.5px] text-slate-600 dark:text-slate-400 font-normal" title="Purchase Cost Price">
                              {currency} {(item.costPrice || 0).toLocaleString()}
                            </td>
                          )}

                          {/* Selling Price - Editable inline for authorized roles */}
                          <td className="py-1 px-2 text-right">
                            {canOverridePrice ? (
                              <div className="flex flex-col items-end">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={item.rate}
                                  onChange={(e) => updateCartRate(originalIndex, e.target.value)}
                                  className="w-14 px-1 py-0.5 text-right font-normal text-[11px] bg-black/5 dark:bg-white/5 border border-theme-border/40 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono text-slate-900 dark:text-slate-100"
                                  title="Admin: Edit selling price"
                                />
                                {item.isPriceOverridden && (
                                  <span className="text-[8px] font-normal text-amber-500 leading-none mt-0.5">
                                    ● Override
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="font-normal text-[11px] text-slate-900 dark:text-slate-100 font-mono" title="Price locked">
                                {currency} {item.rate.toLocaleString()}
                              </div>
                            )}
                          </td>

                          {/* Quantity Controls */}
                          <td className="py-1 px-1">
                            <div className="inline-flex items-center justify-center bg-black/5 dark:bg-white/5 border border-theme-border/30 rounded-md p-0.5">
                              <button
                                type="button"
                                onClick={() => updateCartQty(originalIndex, item.quantity - 1)}
                                className="w-4 h-4 rounded flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 transition active:scale-90 cursor-pointer"
                                title="Decrease quantity"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <input
                                type="number"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => updateCartQty(originalIndex, e.target.value)}
                                className="w-7 text-center font-normal text-[11px] bg-transparent border-0 focus:outline-none p-0 font-mono text-slate-900 dark:text-slate-100"
                              />
                              <button
                                type="button"
                                onClick={() => updateCartQty(originalIndex, item.quantity + 1)}
                                className="w-4 h-4 rounded flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-emerald-600 transition active:scale-90 cursor-pointer"
                                title="Increase quantity"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </td>

                          {/* Line Total */}
                          <td className="py-1 px-2 text-right font-normal text-[11px] text-slate-900 dark:text-slate-100 font-mono whitespace-nowrap">
                            {currency} {item.lineTotal.toFixed(0)}
                          </td>

                          {/* Remove Action */}
                          <td className="py-1 px-1 text-center">
                            <button
                              type="button"
                              onClick={() => removeCartItem(originalIndex)}
                              className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition active:scale-90 cursor-pointer mx-auto"
                              title="Remove item"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sticky Compact Totals & Customer Panel */}
          <div
            className={`bg-theme-card border border-theme-border rounded-xl p-3 shadow-xs space-y-2.5 ${
              posMode === "barcode" ? "lg:col-span-4" : "w-full"
            }`}
          >
            {/* Customer Details & Name Option */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-theme-textSecondary">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-theme-primary" /> Customer Name
                </span>
                <div className="flex items-center gap-2">
                  {selectedCustomerId && (
                    <button
                      type="button"
                      onClick={() => setIsKhataProfileOpen(true)}
                      className="text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5 text-[10px] font-bold cursor-pointer transition"
                      title="View Customer Khata Profile"
                    >
                      <Eye className="w-3 h-3" /> View Khata
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 text-[10px] font-bold cursor-pointer transition"
                  >
                    <UserPlus className="w-3 h-3" /> + New Khata
                  </button>
                </div>
              </div>

              {/* Customer Name Text Input */}
              <div className="relative">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer Name (Default: Walk-in Customer)"
                  className="w-full px-2.5 py-1.5 text-xs font-semibold bg-black/5 dark:bg-white/5 border border-theme-border rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none transition text-theme-textPrimary placeholder:text-theme-textMuted"
                />
                {customerName && customerName !== "Walk-in Customer" && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerName("Walk-in Customer");
                      setSelectedCustomerId("");
                      setCustomerPhone("");
                    }}
                    className="absolute right-2 top-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                    title="Reset to Walk-in Customer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Existing Customer Records Select */}
              <select
                value={selectedCustomerId}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                className="w-full px-2 py-1 text-[11px] font-medium bg-black/5 dark:bg-white/5 border border-theme-border rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none transition cursor-pointer text-theme-textSecondary"
              >
                <option value="">-- Or Select Existing Customer / Khata --</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.phone ? `(${c.phone})` : ""} - Bal: PKR {c.currentBalance.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method Toggle */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-theme-textSecondary flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-theme-primary" /> Payment Method
              </label>
              <div className="grid grid-cols-4 gap-1 p-0.5 bg-black/5 dark:bg-white/5 rounded-xl border border-theme-border/60">
                {[
                  { id: "Cash", label: "Cash" },
                  { id: "Card / Bank", label: "Card/Bank" },
                  { id: "Split Payment", label: "Split" },
                  { id: "AR Khata / Credit", label: "Khata" }
                ].map((m) => {
                  const isActive = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(m.id);
                        if (m.id === "Split Payment") {
                          const half = Math.round(grandTotal / 2);
                          setSplitCash(half);
                          setSplitBank(grandTotal - half);
                        }
                      }}
                      className={`py-1.5 px-1 rounded-lg text-xs font-bold transition text-center truncate cursor-pointer ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-theme-textSecondary hover:text-theme-textPrimary hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Split Payment Controls */}
            {paymentMethod === "Split Payment" && (
              <div className="space-y-2 p-2.5 bg-emerald-500/5 dark:bg-emerald-950/20 rounded-xl border border-emerald-500/20">
                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                  <span>Split Payment Breakdown</span>
                  <span className="text-[9px] text-theme-textMuted uppercase font-medium">Cash + Digital</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-theme-textMuted uppercase block mb-0.5">
                      Cash ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={grandTotal}
                      value={splitCash}
                      onChange={(e) => {
                        const cVal = parseFloat(e.target.value) || 0;
                        setSplitCash(cVal);
                        setSplitBank(Math.max(0, grandTotal - cVal));
                      }}
                      className="w-full px-2 py-1 text-xs font-bold bg-theme-card border border-theme-border rounded-lg text-right font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none text-theme-textPrimary"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-theme-textMuted uppercase block mb-0.5">
                      Bank ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={splitBank}
                      onChange={(e) => setSplitBank(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs font-bold bg-theme-card border border-theme-border rounded-lg text-right font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none text-theme-textPrimary"
                    />
                  </div>
                </div>
                <div>
                  <select
                    value={splitProvider}
                    onChange={(e) => setSplitProvider(e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-medium bg-theme-card border border-theme-border rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none text-theme-textPrimary"
                  >
                    <option value="Card (POS Machine)">Card (POS Machine)</option>
                    <option value="EasyPaisa">EasyPaisa</option>
                    <option value="JazzCash">JazzCash</option>
                    <option value="Online Bank Transfer">Online Bank Transfer</option>
                    <option value="Raast P2P">Raast P2P</option>
                  </select>
                </div>
              </div>
            )}

            {/* Financial Calculations */}
            <div className="space-y-1.5 pt-1.5 border-t border-theme-border text-xs">
              <div className="flex justify-between items-center text-theme-textSecondary text-[11px]">
                <span className="font-medium">Subtotal</span>
                <span className="font-bold text-theme-textPrimary font-mono">{currency} {subtotal.toFixed(2)}</span>
              </div>

              {/* Discount Input */}
              <div className="flex items-center justify-between text-theme-textSecondary text-[11px]">
                <span className="font-medium">Order Discount</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-theme-textMuted font-mono">{currency}</span>
                  <input
                    type="number"
                    min="0"
                    value={overallDiscount}
                    onChange={(e) => setOverallDiscount(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-0.5 text-right font-bold text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Grand Total Banner */}
              <div className="bg-gradient-to-r from-emerald-700 via-emerald-700 to-emerald-800 text-white rounded-xl p-3 shadow-md shadow-emerald-800/15 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider block opacity-90 leading-tight">
                    Grand Total
                  </span>
                  <span className="text-xl font-black tracking-tight leading-none mt-0.5 block font-mono">
                    {currency} {grandTotal.toFixed(0)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="inline-block text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-md backdrop-blur-xs">
                    {cart.reduce((sum, i) => sum + (parseFloat(i.quantity) || 0), 0)} Units ({cart.length} Items)
                  </span>
                </div>
              </div>

              {/* Cash Received, Change Due & Quick Preset Chips */}
              {paymentMethod === "Cash" && (
                <div className="space-y-2 pt-1">
                  {/* Quick Preset Chips */}
                  <div className="grid grid-cols-6 gap-1">
                    {[
                      { label: "Exact", action: () => handleCashPreset("exact"), isPrimary: true },
                      { label: "+50", action: () => handleCashPreset("+50") },
                      { label: "+100", action: () => handleCashPreset("+100") },
                      { label: "500", action: () => handleCashPreset(500) },
                      { label: "1000", action: () => handleCashPreset(1000) },
                      { label: "5000", action: () => handleCashPreset(5000) }
                    ].map((chip, chipIdx) => (
                      <button
                        key={chipIdx}
                        type="button"
                        onClick={chip.action}
                        className={`h-7 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                          chip.isPrimary
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white"
                            : "bg-black/5 dark:bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-600 text-theme-textSecondary border border-theme-border/60 font-mono"
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-theme-textMuted uppercase block mb-1 tracking-wider">
                        Cash Received
                      </label>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 text-xs font-bold bg-black/5 dark:bg-white/5 border border-theme-border rounded-lg text-right font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-theme-textMuted uppercase block mb-1 tracking-wider">
                        {paymentMethod === "AR Khata / Credit" && cashReceived < grandTotal
                          ? "Khata Due"
                          : "Change Due"}
                      </label>
                      <div
                        className={`w-full px-2.5 py-1.5 text-xs font-black rounded-lg text-right font-mono flex items-center justify-end border ${
                          paymentMethod === "AR Khata / Credit" && cashReceived < grandTotal
                            ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800"
                            : "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                        }`}
                      >
                        {currency}{" "}
                        {paymentMethod === "AR Khata / Credit" && cashReceived < grandTotal
                          ? balanceDue.toFixed(0)
                          : changeDue.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Main Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={isSubmitting || cart.length === 0}
                onClick={() => handleProcessSale("Completed", true)}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Processing Sale..." : "Pay & Print 80mm (F3)"}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSubmitting || cart.length === 0}
                  onClick={() => handleProcessSale("Completed", false)}
                  className="py-1.5 px-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs transition cursor-pointer shadow-xs text-center"
                >
                  {isSubmitting ? "Saving..." : "Save (F4)"}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || cart.length === 0}
                  onClick={handleHoldBill}
                  className="py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                >
                  <PauseCircle className="w-3 h-3" /> Hold (F7)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM FUNCTION-KEY SHORTCUT BAR (Image 3 IXERSHOP POS) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 text-white px-3 py-2 flex items-center justify-between overflow-x-auto shadow-2xl">
        <div className="flex items-center gap-2 text-xs font-semibold whitespace-nowrap">
          <button
            onClick={clearCart}
            disabled={isSubmitting}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 transition"
          >
            <span className="text-amber-400 font-bold mr-1">F1</span> New Sale
          </button>
          <button
            onClick={() => handleProcessSale("Completed", true)}
            disabled={isSubmitting || cart.length === 0}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white transition font-bold"
          >
            <span className="text-white font-black mr-1">F3</span> {isSubmitting ? "Processing..." : "Pay & Print"}
          </button>
          <button
            onClick={() => handleProcessSale("Completed", false)}
            disabled={isSubmitting || cart.length === 0}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 transition"
          >
            <span className="text-emerald-400 font-bold mr-1">F4</span> Save Order
          </button>
          <button
            onClick={() => {
              setPaymentMethod("AR Khata / Credit");
              showToast("Payment switched to AR Khata", "info");
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            <span className="text-emerald-400 font-bold mr-1">F6</span> To AR Khata
          </button>
          <button
            onClick={handleHoldBill}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            <span className="text-amber-400 font-bold mr-1">F7</span> Hold Bill
          </button>
          <button
            onClick={fetchHeldBills}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            <span className="text-emerald-400 font-bold mr-1">F8</span> Recall Bill
          </button>
          <button
            onClick={clearCart}
            className="px-2.5 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 transition"
          >
            <span className="text-rose-400 font-bold mr-1">F10</span> Void Sale
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>Terminal #01</span> • <span>Active Cashier</span>
        </div>
      </div>

      {/* 5. MODAL: CREATE QUICK KHATA CUSTOMER */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-lg p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <h3 className="font-bold text-base text-theme-textPrimary flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-theme-primary" /> + New Khata Customer
              </h3>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-theme-textMuted hover:text-theme-textPrimary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Haji Muhammad Aslam"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-medium focus:ring-2 focus:ring-theme-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-medium focus:ring-2 focus:ring-theme-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-theme-textSecondary block mb-1">Credit Limit (PKR)</label>
                <input
                  type="number"
                  value={newCustLimit}
                  onChange={(e) => setNewCustLimit(parseFloat(e.target.value) || 50000)}
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl font-medium focus:ring-2 focus:ring-theme-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-theme-border hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-theme-primary hover:bg-theme-dark text-white font-bold"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: RECALL HELD BILLS */}
      {isHeldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card border border-theme-border rounded-lg p-5 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <h3 className="font-bold text-base text-theme-textPrimary flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-amber-500" /> Held Bills ({heldBills.length})
              </h3>
              <button
                onClick={() => setIsHeldModalOpen(false)}
                className="text-theme-textMuted hover:text-theme-textPrimary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {heldBills.length === 0 ? (
                <div className="py-8 text-center text-xs text-theme-textMuted">
                  No held bills found.
                </div>
              ) : (
                heldBills.map((b) => (
                  <div
                    key={b._id}
                    className="p-3 rounded-xl border border-theme-border hover:border-theme-primary/40 bg-black/5 dark:bg-white/5 flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <div className="font-bold text-theme-textPrimary">Bill #{b.billID}</div>
                      <div className="text-theme-textMuted">
                        {b.customerName} • {new Date(b.createdAt).toLocaleTimeString()}
                      </div>
                      <div className="text-[11px] font-medium text-theme-primary">
                        {b.salesItems?.length || 0} items
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="font-black text-sm text-theme-textPrimary">
                        {currency} {(b.grandTotal || 0).toLocaleString()}
                      </div>
                      <button
                        type="button"
                        onClick={() => recallBill(b)}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                      >
                        Recall
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: 80MM THERMAL RECEIPT PRINT MODAL */}
      {isPrintModalOpen && printedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-card text-theme-textPrimary border border-theme-border rounded-xl p-4 sm:p-5 max-w-sm w-full shadow-2xl space-y-3.5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-theme-border">
              <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Bill Processed
              </span>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="text-theme-textMuted hover:text-theme-textPrimary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Preview Container */}
            <div className="flex-1 overflow-y-auto border border-theme-border rounded-lg p-2 bg-theme-bg">
              <Receipt80mm ref={printRef} bill={printedBill} />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-theme-border">
              <button
                type="button"
                onClick={() => handleShareWhatsApp(printedBill)}
                className="py-2 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20 flex items-center justify-center gap-1.5 transition"
                title="Send Bill via WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="flex-1 py-2 rounded-lg border border-theme-border text-xs font-semibold text-theme-textSecondary hover:bg-theme-bg transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4" /> Print (80mm)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: COMPLETE CUSTOMER KHATA PROFILE */}
      <CustomerKhataProfileModal
        customerId={selectedCustomerId}
        isOpen={isKhataProfileOpen}
        onClose={() => setIsKhataProfileOpen(false)}
        onPaymentRecorded={fetchData}
      />
    </div>
  );
}

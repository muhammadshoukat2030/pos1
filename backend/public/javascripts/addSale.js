/* ==========================================================================
   SUPER MART POS TERMINAL CLIENT JAVASCRIPT
   Supports: Barcode Scanner, Decimal Qty, Picture Grid (+), Function Keys (F1-F10),
             Held Bills, AR Khata, Change Calculator & 80mm Thermal Receipt
   ========================================================================== */

(function () {
  "use strict";

  // 1. DATA INITIALIZATION
  let products = [];
  try {
    const rawProd = document.getElementById("productsRawData");
    products = rawProd ? JSON.parse(rawProd.textContent) : [];
  } catch (e) {
    console.error("Products JSON parse error:", e);
  }

  let storeSettings = {};
  try {
    const rawSet = document.getElementById("storeSettingsRaw");
    storeSettings = rawSet ? JSON.parse(rawSet.textContent) : {};
  } catch (e) {
    console.error("Settings JSON parse error:", e);
  }

  const currencySymbol = storeSettings.currency || "PKR";
  let cartItems = [];
  let selectedQuickProduct = null;
  let currentBillID = generateBillID();

  // Initialize Bill ID in UI
  const billIdInput = document.getElementById("posBillID");
  if (billIdInput) billIdInput.value = currentBillID;

  function generateBillID() {
    const prefix = storeSettings.businessType && storeSettings.businessType.includes("Mart") ? "MART" : "POS";
    const rand = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}-${rand}`;
  }

  // 2. LIVE CLOCK
  function initClock() {
    const clockEl = document.getElementById("posClock");
    if (!clockEl) return;
    function tick() {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString("en-US", {
        timeZone: "Asia/Karachi",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
    }
    setInterval(tick, 1000);
    tick();
  }
  initClock();

  // 3. VIEW MODE TOGGLE (Split / Barcode / Grid)
  window.switchPosView = function (mode) {
    const workspace = document.getElementById("posWorkspace");
    if (!workspace) return;
    workspace.setAttribute("data-active-mode", mode);

    document.querySelectorAll(".btn-toggle").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });
  };

  // 4. QUICK BARCODE ENTRY & SEARCH
  const quickSearchInput = document.getElementById("quickSearchInput");
  const searchDropdown = document.getElementById("searchDropdown");
  const quickQty = document.getElementById("quickQty");
  const quickRate = document.getElementById("quickRate");
  const quickTax = document.getElementById("quickTax");
  const quickDiscount = document.getElementById("quickDiscount");
  const quickTotalDisplay = document.getElementById("quickTotalDisplay");
  const btnClearSearch = document.getElementById("btnClearSearch");

  // Search input typing & hardware scanner enter detection
  if (quickSearchInput) {
    quickSearchInput.addEventListener("input", function () {
      const query = this.value.trim().toLowerCase();
      if (btnClearSearch) btnClearSearch.style.display = query ? "block" : "none";

      if (!query) {
        if (searchDropdown) searchDropdown.style.display = "none";
        return;
      }

      // Filter matches
      const matches = products.filter(p => {
        const name = (p.itemName || "").toLowerCase();
        const barcode = (p.barcode || p.stockID || "").toLowerCase();
        const brand = (p.brandName || p.brand || "").toLowerCase();
        return name.includes(query) || barcode.includes(query) || brand.includes(query);
      }).slice(0, 8);

      renderSearchDropdown(matches);
    });

    // Hardware Scanner Auto-Submit on Enter key
    quickSearchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        const query = this.value.trim().toLowerCase();
        if (!query) return;

        // Exact match by barcode or stockID first
        let exactMatch = products.find(p => 
          (p.barcode && p.barcode.toLowerCase() === query) ||
          (p.stockID && p.stockID.toLowerCase() === query)
        );

        if (!exactMatch) {
          // If no exact barcode match, take top match from query
          exactMatch = products.find(p => (p.itemName || "").toLowerCase().includes(query));
        }

        if (exactMatch) {
          selectProductIntoQuickBar(exactMatch);
          addSelectedOrQuickItem();
        } else {
          alert(`Item with Barcode/SKU "${query}" not found.`);
        }
      }
    });
  }

  if (btnClearSearch) {
    btnClearSearch.addEventListener("click", () => {
      quickSearchInput.value = "";
      btnClearSearch.style.display = "none";
      if (searchDropdown) searchDropdown.style.display = "none";
      resetQuickBar();
      quickSearchInput.focus();
    });
  }

  function renderSearchDropdown(items) {
    if (!searchDropdown) return;
    if (items.length === 0) {
      searchDropdown.innerHTML = `<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 12px;">No matching items found</div>`;
      searchDropdown.style.display = "block";
      return;
    }

    searchDropdown.innerHTML = items.map(p => `
      <div class="search-dropdown-item" data-stockid="${p.stockID}">
        <div class="search-item-meta">
          <span class="item-title">${p.itemName}</span>
          <span class="item-sub">Barcode: ${p.barcode || p.stockID} • Stock: ${p.remaining} ${p.unit || p.qty || 'pcs'}</span>
        </div>
        <div class="search-item-price">${currencySymbol} ${(p.salePrice || p.rate || 0).toLocaleString()}</div>
      </div>
    `).join("");

    searchDropdown.querySelectorAll(".search-dropdown-item").forEach(itemEl => {
      itemEl.addEventListener("click", function () {
        const stockID = this.dataset.stockid;
        const prod = products.find(p => p.stockID === stockID);
        if (prod) {
          selectProductIntoQuickBar(prod);
          searchDropdown.style.display = "none";
        }
      });
    });

    searchDropdown.style.display = "block";
  }

  function selectProductIntoQuickBar(prod) {
    selectedQuickProduct = prod;
    if (quickSearchInput) quickSearchInput.value = `${prod.itemName} (${prod.barcode || prod.stockID})`;
    if (quickRate) quickRate.value = prod.salePrice || prod.rate || 0;
    if (quickTax) quickTax.value = storeSettings.taxRate || 0;
    if (quickDiscount) quickDiscount.value = 0;
    updateQuickSubTotal();
  }

  function updateQuickSubTotal() {
    const qty = parseFloat(quickQty.value) || 0;
    const rate = parseFloat(quickRate.value) || 0;
    const tax = parseFloat(quickTax.value) || 0;
    const disc = parseFloat(quickDiscount.value) || 0;

    const baseAmount = qty * rate;
    const taxAmount = (tax / 100) * baseAmount;
    const discAmount = disc * qty;
    const total = Math.max(0, baseAmount + taxAmount - discAmount);

    if (quickTotalDisplay) {
      quickTotalDisplay.textContent = `${currencySymbol} ${total.toFixed(2)}`;
    }
  }

  [quickQty, quickRate, quickTax, quickDiscount].forEach(input => {
    if (input) input.addEventListener("input", updateQuickSubTotal);
  });

  window.resetQuickBar = function () {
    selectedQuickProduct = null;
    if (quickSearchInput) quickSearchInput.value = "";
    if (quickQty) quickQty.value = "1";
    if (quickRate) quickRate.value = "";
    if (quickTax) quickTax.value = "0";
    if (quickDiscount) quickDiscount.value = "0";
    if (quickTotalDisplay) quickTotalDisplay.textContent = `${currencySymbol} 0.00`;
    if (searchDropdown) searchDropdown.style.display = "none";
  };

  // Add Item to cart from Quick Bar
  window.addSelectedOrQuickItem = function () {
    if (!selectedQuickProduct) {
      alert("⚠️ Please scan a barcode or select an item first.");
      if (quickSearchInput) quickSearchInput.focus();
      return;
    }

    const qty = parseFloat(quickQty.value) || 0;
    const rate = parseFloat(quickRate.value) || 0;
    const tax = parseFloat(quickTax.value) || 0;
    const disc = parseFloat(quickDiscount.value) || 0;

    if (qty <= 0) {
      alert("⚠️ Quantity must be greater than 0.");
      return;
    }

    addItemToCart(selectedQuickProduct, qty, rate, tax, disc);
    resetQuickBar();
    if (quickSearchInput) quickSearchInput.focus();
  };

  // 5. PICTURE GRID CATALOG (+) CLICK HANDLER (Image 1)
  window.addCatalogItemDirectly = function (stockID) {
    const prod = products.find(p => p.stockID === stockID);
    if (!prod) return;

    const defaultRate = prod.salePrice || prod.rate || 0;
    const defaultTax = storeSettings.taxRate || 0;
    addItemToCart(prod, 1, defaultRate, defaultTax, 0);
  };

  // Core Cart Item Adder
  function addItemToCart(product, qtyToAdd, rate, taxPct, unitDiscount) {
    // Check available stock
    const existingIndex = cartItems.findIndex(item => item.stockID === product.stockID);
    const alreadyInCart = existingIndex > -1 ? cartItems[existingIndex].quantitySold : 0;
    const totalRequested = alreadyInCart + qtyToAdd;

    if (totalRequested > product.remaining) {
      alert(`⚠️ Insufficient stock for "${product.itemName}". Only ${product.remaining} available.`);
      return;
    }

    if (existingIndex > -1) {
      cartItems[existingIndex].quantitySold += qtyToAdd;
      cartItems[existingIndex].rate = rate;
      cartItems[existingIndex].taxPercent = taxPct;
      cartItems[existingIndex].unitDiscount = unitDiscount;
    } else {
      cartItems.push({
        stockID: product.stockID,
        barcode: product.barcode || product.stockID,
        itemName: product.itemName,
        brandName: product.brandName || product.brand || "General",
        category: product.category || "General",
        unit: product.unit || product.qty || "pcs",
        quantitySold: qtyToAdd,
        rate: rate,
        taxPercent: taxPct,
        unitDiscount: unitDiscount
      });
    }

    renderCartTable();
  }

  // 6. RENDER ITEMIZED SALE TABLE (Image 3)
  function renderCartTable() {
    const tbody = document.getElementById("posTableBody");
    const cartBadge = document.getElementById("cartCountBadge");
    if (!tbody) return;

    if (cartBadge) cartBadge.textContent = `${cartItems.length} Items`;

    if (cartItems.length === 0) {
      tbody.innerHTML = `
        <tr class="empty-cart-row">
          <td colspan="9">
            <div class="empty-cart-state">
              <i class="fas fa-shopping-basket"></i>
              <h4>Cart is empty</h4>
              <p>Scan barcode, click '+' on catalog items, or search above.</p>
            </div>
          </td>
        </tr>
      `;
      calculateTotals();
      return;
    }

    tbody.innerHTML = cartItems.map((item, index) => {
      const base = item.quantitySold * item.rate;
      const taxAmt = (item.taxPercent / 100) * base;
      const discAmt = item.unitDiscount * item.quantitySold;
      const itemTotal = Math.max(0, base + taxAmt - discAmt);

      return `
        <tr data-index="${index}">
          <td>${index + 1}</td>
          <td><span style="font-weight: 600; font-family: monospace;">${item.barcode}</span></td>
          <td>
            <strong>${item.itemName}</strong>
            <div style="font-size: 11px; color: var(--text-muted);">${item.brandName} • ${item.unit}</div>
          </td>
          <td>
            <input type="number" step="any" min="0.1" value="${item.quantitySold}" 
                   class="table-qty-input" onchange="updateCartItemQty(${index}, this.value)" />
          </td>
          <td>${currencySymbol} ${item.rate.toFixed(2)}</td>
          <td>${item.taxPercent}%</td>
          <td>${currencySymbol} ${item.unitDiscount.toFixed(2)}</td>
          <td><strong style="color: var(--primary-color);">${currencySymbol} ${itemTotal.toFixed(2)}</strong></td>
          <td style="text-align: center;">
            <button type="button" class="btn-remove-row" onclick="removeCartItem(${index})" title="Remove item">
              <i class="fas fa-trash-alt"></i>
            </button>
          </td>
        </tr>
      `;
    }).join("");

    calculateTotals();
  }

  window.updateCartItemQty = function (index, newQtyStr) {
    const newQty = parseFloat(newQtyStr) || 1;
    if (newQty <= 0) {
      removeCartItem(index);
      return;
    }
    const item = cartItems[index];
    const prod = products.find(p => p.stockID === item.stockID);
    if (prod && newQty > prod.remaining) {
      alert(`⚠️ Stock short! Available remaining: ${prod.remaining}`);
      renderCartTable();
      return;
    }
    item.quantitySold = newQty;
    renderCartTable();
  };

  window.removeCartItem = function (index) {
    cartItems.splice(index, 1);
    renderCartTable();
  };

  // 7. TOTALS & CHANGE CALCULATION
  function calculateTotals() {
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    cartItems.forEach(it => {
      const base = it.quantitySold * it.rate;
      const tax = (it.taxPercent / 100) * base;
      const disc = it.unitDiscount * it.quantitySold;

      subtotal += base;
      totalTax += tax;
      totalDiscount += disc;
    });

    const grandTotal = Math.max(0, subtotal + totalTax - totalDiscount);

    document.getElementById("displaySubtotal").textContent = `${currencySymbol} ${subtotal.toFixed(2)}`;
    document.getElementById("displayTotalTax").textContent = `${currencySymbol} ${totalTax.toFixed(2)}`;
    document.getElementById("displayTotalDiscount").textContent = `- ${currencySymbol} ${totalDiscount.toFixed(2)}`;
    document.getElementById("displayGrandTotal").textContent = `${currencySymbol} ${grandTotal.toFixed(2)}`;

    calculateBalanceAndChange();
  }

  window.calculateBalanceAndChange = function () {
    const grandTotalText = document.getElementById("displayGrandTotal").textContent.replace(currencySymbol, "").trim();
    const grandTotal = parseFloat(grandTotalText) || 0;
    const cashInput = document.getElementById("inputCashReceived");
    const cashVal = parseFloat(cashInput ? cashInput.value : 0) || 0;

    const changeDue = Math.max(0, cashVal - grandTotal);
    const balanceDue = Math.max(0, grandTotal - cashVal);

    const changeEl = document.getElementById("displayChangeDue");
    const balanceEl = document.getElementById("displayBalanceDue");

    if (changeEl) changeEl.textContent = `${currencySymbol} ${changeDue.toFixed(2)}`;
    if (balanceEl) balanceEl.textContent = `${currencySymbol} ${balanceDue.toFixed(2)}`;
  };

  // 8. FUNCTION KEYBAR ACTIONS (F1 - F10)
  // (F1) New Sale
  window.triggerNewSale = function () {
    if (cartItems.length > 0 && !confirm("Are you sure you want to start a fresh sale? Current unsaved items will be cleared.")) {
      return;
    }
    cartItems = [];
    currentBillID = generateBillID();
    if (billIdInput) billIdInput.value = currentBillID;
    document.getElementById("posCustomerName").value = "Walk-in Customer";
    document.getElementById("posCustomerPhone").value = "";
    document.getElementById("inputCashReceived").value = "";
    renderCartTable();
    if (quickSearchInput) quickSearchInput.focus();
  };

  // (F10) Void Order
  window.triggerVoidOrder = function () {
    if (cartItems.length === 0) return alert("Cart is already empty.");
    if (confirm("⚠️ Clear and VOID current order?")) {
      cartItems = [];
      renderCartTable();
    }
  };

  // (F7) Hold Bill (Parks bill in localStorage)
  window.triggerHoldBill = function () {
    if (cartItems.length === 0) return alert("⚠️ Cart is empty. Nothing to hold.");
    
    const customerName = document.getElementById("posCustomerName").value.trim() || "Walk-in";
    const heldBills = JSON.parse(localStorage.getItem("pos_held_bills") || "[]");

    const heldItem = {
      id: currentBillID,
      customerName,
      customerPhone: document.getElementById("posCustomerPhone").value.trim(),
      items: cartItems,
      date: new Date().toLocaleTimeString(),
      total: document.getElementById("displayGrandTotal").textContent
    };

    heldBills.push(heldItem);
    localStorage.setItem("pos_held_bills", JSON.stringify(heldBills));
    updateHeldCount();

    alert(`✅ Order ${currentBillID} held successfully! You can recall it anytime.`);
    triggerNewSale();
  };

  function updateHeldCount() {
    const heldBills = JSON.parse(localStorage.getItem("pos_held_bills") || "[]");
    const badge = document.getElementById("heldCountBadge");
    if (badge) badge.textContent = heldBills.length;
  }
  updateHeldCount();

  window.openHeldBillsModal = function () {
    const modal = document.getElementById("heldBillsModal");
    const container = document.getElementById("heldBillsList");
    const heldBills = JSON.parse(localStorage.getItem("pos_held_bills") || "[]");

    if (heldBills.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">No held bills found.</div>`;
    } else {
      container.innerHTML = heldBills.map((b, idx) => `
        <div class="held-bill-item">
          <div class="held-bill-info">
            <h4>${b.id} — ${b.customerName}</h4>
            <p>${b.items.length} items • ${b.total} • Held at ${b.date}</p>
          </div>
          <button type="button" class="btn-recall" onclick="recallHeldBill(${idx})">
            Recall Bill &rarr;
          </button>
        </div>
      `).join("");
    }

    if (modal) modal.classList.add("open");
  };

  window.closeHeldBillsModal = function () {
    const modal = document.getElementById("heldBillsModal");
    if (modal) modal.classList.remove("open");
  };

  window.recallHeldBill = function (idx) {
    const heldBills = JSON.parse(localStorage.getItem("pos_held_bills") || "[]");
    const selected = heldBills[idx];
    if (!selected) return;

    cartItems = selected.items;
    currentBillID = selected.id;
    if (billIdInput) billIdInput.value = currentBillID;
    document.getElementById("posCustomerName").value = selected.customerName;
    document.getElementById("posCustomerPhone").value = selected.customerPhone || "";

    heldBills.splice(idx, 1);
    localStorage.setItem("pos_held_bills", JSON.stringify(heldBills));
    updateHeldCount();

    closeHeldBillsModal();
    renderCartTable();
  };

  // (F6) Convert to AR / Khata
  window.triggerSaveAR = function () {
    document.getElementById("posPaymentMethod").value = "AR Khata / Credit";
    triggerSave(false, true); // save and notify AR
  };

  // (F3) Apply Payment & Finalize (Triggers 80mm Thermal Receipt)
  window.triggerApplyPayment = function () {
    const grandTotalText = document.getElementById("displayGrandTotal").textContent.replace(currencySymbol, "").trim();
    const grandTotal = parseFloat(grandTotalText) || 0;
    const cashInput = document.getElementById("inputCashReceived");
    if (!cashInput.value) {
      cashInput.value = grandTotal;
      calculateBalanceAndChange();
    }
    triggerSave(true, true);
  };

  // Master Save Handler
  window.triggerSave = async function (printReceipt = false, returnOrReload = false) {
    if (cartItems.length === 0) {
      alert("⚠️ Cart is empty. Please add items before saving.");
      return;
    }

    const customerName = document.getElementById("posCustomerName").value.trim() || "Walk-in Customer";
    const customerPhone = document.getElementById("posCustomerPhone").value.trim();
    const agentSelect = document.getElementById("posAgentSelect");
    const agentPctInput = document.getElementById("posAgentPct");
    const orderType = document.getElementById("posOrderType").value;
    const paymentMethod = document.getElementById("posPaymentMethod").value;
    const cashReceived = parseFloat(document.getElementById("inputCashReceived").value) || 0;
    const changeDueText = document.getElementById("displayChangeDue").textContent.replace(currencySymbol, "").trim();
    const changeDue = parseFloat(changeDueText) || 0;

    const payloadSales = cartItems.map(item => ({
      stockID: item.stockID,
      barcode: item.barcode,
      itemName: item.itemName,
      brandName: item.brandName,
      category: item.category,
      unit: item.unit,
      quantitySold: item.quantitySold,
      rate: item.rate,
      unitTax: (item.taxPercent / 100) * item.rate,
      unitDiscount: item.unitDiscount
    }));

    const payload = {
      customerName,
      customerPhone,
      billID: currentBillID,
      sales: payloadSales,
      agentID: agentSelect ? agentSelect.value : null,
      percentage: parseFloat(agentPctInput ? agentPctInput.value : 0) || 0,
      orderType,
      status: "Completed",
      paymentMethod,
      cashReceived,
      changeDue
    };

    try {
      const res = await fetch("/sales/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        // Store for 80mm thermal receipt
        localStorage.setItem("lastAddedSales", JSON.stringify(payloadSales));
        localStorage.setItem("lastCustomerName", customerName);
        localStorage.setItem("lastSalesBillID", currentBillID);
        localStorage.setItem("lastPaymentMethod", paymentMethod);
        localStorage.setItem("lastCashReceived", cashReceived);
        localStorage.setItem("lastChangeDue", changeDue);

        if (printReceipt) {
          window.open("/sales/print", "_blank");
        }

        alert(`✅ Order ${currentBillID} saved successfully!`);

        if (returnOrReload) {
          window.location.reload();
        } else {
          triggerNewSale();
        }
      } else {
        alert("❌ Save failed: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("❌ Server Connection Error while saving sale.");
    }
  };

  // 9. GLOBAL FUNCTION KEYBOARD SHORTCUTS (F1 - F10)
  window.addEventListener("keydown", function (e) {
    // Check if key is F1 to F10
    if (e.key === "F1") {
      e.preventDefault();
      triggerNewSale();
    } else if (e.key === "F3") {
      e.preventDefault();
      triggerApplyPayment();
    } else if (e.key === "F4") {
      e.preventDefault();
      triggerSave(false, false);
    } else if (e.key === "F5") {
      e.preventDefault();
      triggerSave(true, true);
    } else if (e.key === "F6") {
      e.preventDefault();
      triggerSaveAR();
    } else if (e.key === "F7") {
      e.preventDefault();
      triggerHoldBill();
    } else if (e.key === "F10") {
      e.preventDefault();
      triggerVoidOrder();
    }
  });

  // 10. CATALOG FILTERING (Category & Brand)
  window.filterCatalog = function (category, btn) {
    document.querySelectorAll(".cat-pill").forEach(el => el.classList.remove("active"));
    btn.classList.add("active");

    const cards = document.querySelectorAll(".catalog-card");
    cards.forEach(card => {
      const cardCat = card.dataset.category || "";
      if (category === "all" || cardCat === category.toLowerCase()) {
        card.style.display = "flex";
      } else {
        card.style.display = "none";
      }
    });
  };

  window.filterCatalogBrand = function (brand, btn) {
    document.querySelectorAll(".cat-pill").forEach(el => el.classList.remove("active"));
    btn.classList.add("active");

    const cards = document.querySelectorAll(".catalog-card");
    cards.forEach(card => {
      const cardBrand = card.dataset.brand || "";
      if (cardBrand === brand.toLowerCase()) {
        card.style.display = "flex";
      } else {
        card.style.display = "none";
      }
    });
  };

  // 11. QUICK CUSTOMER MODAL
  window.openCustomerModal = function () {
    const modal = document.getElementById("customerModal");
    if (modal) modal.classList.add("open");
  };

  window.closeCustomerModal = function () {
    const modal = document.getElementById("customerModal");
    if (modal) modal.classList.remove("open");
  };

  window.saveModalCustomer = function () {
    const name = document.getElementById("modalCustomerName").value.trim();
    const phone = document.getElementById("modalCustomerPhone").value.trim();
    if (name) document.getElementById("posCustomerName").value = name;
    if (phone) document.getElementById("posCustomerPhone").value = phone;
    closeCustomerModal();
  };

})();

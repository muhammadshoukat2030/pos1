document.addEventListener('DOMContentLoaded', () => {
    // 🟢 1. Database se Data Fetch Karna
    const dataProvider = document.getElementById('db-data-provider');
    let dbDefinitions = [];
    if (dataProvider) {
        try {
            dbDefinitions = JSON.parse(dataProvider.getAttribute('data-definitions') || "[]");
        } catch (e) { console.error("Data error:", e); }
    }

    // DOM Elements
    const brandFilter = document.getElementById('brandFilter');
    const itemFilter = document.getElementById('itemNameFilter');
    const colourFilter = document.getElementById('colourNameFilter');
    const unitFilter = document.getElementById('unitFilter');
    const filterSelect = document.getElementById('filter');
    const filterForm = document.getElementById('filterForm');
    const tableContainer = document.getElementById('tableContainer');
    const fromInput = document.getElementById('from');
    const toInput = document.getElementById('to');
    const applyBtn = document.getElementById('apply');

    // ===================== CUSTOM FILTER TOGGLE =========================

    function toggleCustomDates() {
        if (filterSelect.value === 'custom') {
            fromInput.style.display = 'inline-block';
            toInput.style.display = 'inline-block';
            applyBtn.style.display = 'inline-block';
        } else {
            fromInput.style.display = 'none';
            toInput.style.display = 'none';
            applyBtn.style.display = 'none';
        }
    }

    // ===================== DYNAMIC POPULATE FUNCTIONS =========================

    function populateItemFilter(brandName) {
        itemFilter.innerHTML = '<option value="all">All Items</option>';
        if (brandName === 'all') { itemFilter.disabled = true; return; }
        
        const brandData = dbDefinitions.find(d => d.brandName === brandName);
        if (brandData && brandData.products) {
            brandData.products.forEach(p => {
                const o = document.createElement('option');
                o.value = p.itemName; o.textContent = p.itemName;
                if (window.selectedItem === p.itemName) o.selected = true;
                itemFilter.appendChild(o);
            });
            itemFilter.disabled = false;
        }
    }

    function populateUnitFilter(brandName) {
        unitFilter.innerHTML = '<option value="all">All Units</option>';
        if (brandName === 'all') { unitFilter.disabled = true; return; }

        const brandData = dbDefinitions.find(d => d.brandName === brandName);
        if (brandData && brandData.units) {
            brandData.units.forEach(u => {
                const o = document.createElement('option');
                o.value = u; o.textContent = u;
                if (window.selectedUnit === u) o.selected = true;
                unitFilter.appendChild(o);
            });
            unitFilter.disabled = false;
        }
    }

    function populateColourFilter(brandName, itemName) {
        colourFilter.innerHTML = '<option value="all">All Colours</option>';
        if (brandName === 'all' || itemName === 'all') { colourFilter.disabled = true; return; }

        const brandData = dbDefinitions.find(d => d.brandName === brandName);
        const product = brandData?.products.find(p => p.itemName === itemName);

        if (product && product.colors) {
            product.colors.forEach(c => {
                const val = c.code ? `${c.colour} (Code: ${c.code})` : c.colour;
                const o = document.createElement('option');
                o.value = val; o.textContent = val;
                if (window.selectedColour === val) o.selected = true;
                colourFilter.appendChild(o);
            });
            colourFilter.disabled = false;
        }
    }

    // ===================== AJAX TABLE UPDATE =========================

    async function updateTable() {
        const formData = new URLSearchParams(new FormData(filterForm)).toString();
        const tbody = document.querySelector('tbody');
        const loader = document.getElementById('table-loader');
        
        if (loader) {
            loader.style.display = 'flex';
            loader.style.flexDirection = 'column';
            loader.style.alignItems = 'center';
            loader.style.justifyContent = 'center';
            
            // Center absolute positioning
            loader.style.position = 'absolute';
            loader.style.top = '50%';
            loader.style.left = '50%';
            loader.style.transform = 'translate(-50%, -50%)';
            loader.style.zIndex = '100';
        }

        if (tableContainer) {
            tableContainer.style.position = 'relative';
            tableContainer.classList.add('loading-active');
        }

        tbody.style.opacity = '0.3';

        try {
            const res = await fetch(`/products/all?${formData}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const data = await res.json();

            if (data.success) {
                // Update Stats
                const statsPs = document.querySelectorAll('.stat-box p');
                if (statsPs.length >= 5) {
                    statsPs[0].innerText = data.stats.totalStock || 0;
                    statsPs[1].innerText = `Rs ${Number(data.stats.totalValue || 0).toLocaleString()}`;
                    statsPs[2].innerText = data.stats.totalRemaining || 0;
                    statsPs[3].innerText = `Rs ${Number(data.stats.remaining || 0).toLocaleString()}`;
                    statsPs[4].innerText = `Rs ${Number(data.stats.totalRefundedValue || 0).toLocaleString()}`;
                }

                // Build Table
                let html = '';
                if (data.products.length === 0) {
                    html = `<tr><td colspan="13" class="no-data">No products found.</td></tr>`;
                } else {
                    data.products.forEach(p => {
                        const dateObj = new Date(p.createdAt);
                        const formattedDate = dateObj.toLocaleDateString('en-GB', { 
                            day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' 
                        });
                        const formattedTime = dateObj.toLocaleTimeString('en-GB', { 
                            hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' 
                        });

                        const remainingColor = Number(p.remaining) <= 0 ? '#d9534f' : '#28a745';

                        html += `
                        <tr>
                            <td><strong>${p.stockID}</strong></td>
                            <td>${p.brandName}</td>
                            <td>${p.itemName}</td>
                            <td>${p.colourName}</td>
                            <td>${p.qty}</td>
                            <td>${p.totalProduct}</td>
                            <td style="color: ${remainingColor}; font-weight: bold;">${p.remaining}</td>
                            <td>Rs ${p.rate}</td>
                            <td>Rs ${(p.totalProduct * p.rate).toFixed(2)}</td>
                            <td class="refund-status">${p.refundStatus || 'none'}</td>
                            <td class="refund-quantity">${p.refundQuantity || 0}</td>
                            <td>
                                ${formattedDate}
                                <br>
                                <small style="color: #007bff; font-weight: bold;">${formattedTime}</small>
                            </td>
                            ${data.role === "admin" ? `<td><button class="delete-btn" data-id="${p._id}" id="delete" >Delete</button></td>` : ''}
                        </tr>`;
                    });
                }
                tbody.innerHTML = html;
                attachDeleteEvents();
            }
        } catch (err) { 
            console.error("Error:", err); 
        } finally {
            if (loader) loader.style.display = 'none';
            if (tableContainer) tableContainer.classList.remove('loading-active');
            tbody.style.opacity = '1';
        }
    }

    // ===================== EVENT LISTENERS =========================

    brandFilter.addEventListener('change', () => {
        populateItemFilter(brandFilter.value);
        populateUnitFilter(brandFilter.value);
        itemFilter.value = 'all';
        colourFilter.innerHTML = '<option value="all">All Colours</option>';
        colourFilter.disabled = true;
        updateTable();
    });

    itemFilter.addEventListener('change', () => {
        populateColourFilter(brandFilter.value, itemFilter.value);
        updateTable();
    });

    [unitFilter, colourFilter, document.getElementById('stockStatusFilter'), document.getElementById('refundFilter')].forEach(f => {
        if (f) f.addEventListener('change', updateTable);
    });

    filterSelect.addEventListener('change', () => {
        toggleCustomDates();
        if (filterSelect.value !== 'custom') {
            updateTable();
        }
    });

    applyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        updateTable();
    });

    function attachDeleteEvents() {
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = async function() {
                if (!confirm("⚠️ Are you sure you want to delete this product?")) return;
                try {
                    const res = await fetch(`/products/delete-product/${this.dataset.id}`, { method: "DELETE" });
                    const data = await res.json();
                    if (data.success) { 
                        alert("✅ Product deleted successfully!"); 
                        updateTable(); 
                    } else {
                        alert("❌ Error: " + data.message);
                    }
                } catch (err) {
                    alert("❌ Server error while deleting.");
                }
            };
        });
    }

    // Initial Load
    toggleCustomDates();
    populateItemFilter(window.selectedBrand);
    populateUnitFilter(window.selectedBrand);
    populateColourFilter(window.selectedBrand, window.selectedItem);
    attachDeleteEvents();
});
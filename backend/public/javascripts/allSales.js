document.addEventListener('DOMContentLoaded', () => {
    let dbDefinitions = [];
    const provider = document.getElementById('db-data-provider');
    
    // 1. Load Data
    if (provider && provider.getAttribute('data-definitions')) {
        try {
            dbDefinitions = JSON.parse(provider.getAttribute('data-definitions'));
            console.log("✅ Data Loaded Successfully");
        } catch (e) {
            console.error("❌ Parse Error:", e);
        }
    }

    const brandFilter = document.getElementById('brandFilter');
    const itemFilter = document.getElementById('itemNameFilter');
    const colourFilter = document.getElementById('colourNameFilter');
    const unitFilter = document.getElementById('unitFilter');
    const filterForm = document.getElementById('filterForm');
    const filterSelect = document.getElementById('filter');
    const fromInput = document.getElementById('from');
    const toInput = document.getElementById('to');
    const applyBtn = document.getElementById('apply');
    const tableContainer = document.getElementById('tableContainer');

    // ===================== CUSTOM FILTER TOGGLE =========================
    function toggleCustomDates() {
        if (filterSelect && filterSelect.value === 'custom') {
            if(fromInput) fromInput.style.display = 'inline-block';
            if(toInput) toInput.style.display = 'inline-block';
            if(applyBtn) applyBtn.style.display = 'inline-block';
        } else {
            if(fromInput) fromInput.style.display = 'none';
            if(toInput) toInput.style.display = 'none';
            if(applyBtn) applyBtn.style.display = 'none';
        }
    }

    // ===================== DROPDOWN SYNC LOGIC =========================
    function syncDropdowns(isInitial = false) {
        const selectedBrand = brandFilter.value;
        const preItem = itemFilter.getAttribute('data-selected');
        const preUnit = unitFilter.getAttribute('data-selected');

        itemFilter.innerHTML = '<option value="all">All Items</option>';
        unitFilter.innerHTML = '<option value="all">All Units</option>';
        colourFilter.innerHTML = '<option value="all">All Colours</option>';

        if (selectedBrand === 'all') {
            itemFilter.disabled = true;
            unitFilter.disabled = true;
            colourFilter.disabled = true;
            return;
        }

        const data = dbDefinitions.find(d => d.brandName === selectedBrand);

        if (data) {
            itemFilter.disabled = false;
            unitFilter.disabled = false;

            if (data.products && Array.isArray(data.products)) {
                data.products.forEach(prod => {
                    const name = prod.itemName;
                    if (name) {
                        const opt = new Option(name, name);
                        if (isInitial && name === preItem) opt.selected = true;
                        itemFilter.add(opt);
                    }
                });
            }

            if (data.units && Array.isArray(data.units)) {
                data.units.forEach(u => {
                    const opt = new Option(u, u);
                    if (isInitial && u === preUnit) opt.selected = true;
                    unitFilter.add(opt);
                });
            }
            syncColours(isInitial);
        }
    }

    function syncColours(isInitial = false) {
        const selectedBrand = brandFilter.value;
        const selectedItem = itemFilter.value;
        const preColor = colourFilter.getAttribute('data-selected');

        colourFilter.innerHTML = '<option value="all">All Colours</option>';

        if (selectedItem === 'all') {
            colourFilter.disabled = true;
            return;
        }

        const brandData = dbDefinitions.find(d => d.brandName === selectedBrand);
        
        if (brandData && brandData.products) {
            const selectedProduct = brandData.products.find(p => p.itemName === selectedItem);
            
            if (selectedProduct && selectedProduct.colors && Array.isArray(selectedProduct.colors)) {
                colourFilter.disabled = false;
                selectedProduct.colors.forEach(c => {
                    const cName = c.colour || "Unknown";
                    const cCode = c.code || "";
                    const val = cCode ? `${cName} (Code: ${cCode})` : cName;
                    const opt = new Option(val, val);
                    if (isInitial && val === preColor) opt.selected = true;
                    colourFilter.add(opt);
                });
            } else {
                colourFilter.disabled = true;
            }
        }
    }

    // ===================== AJAX TABLE UPDATE =========================
    async function updateTable() {
        const formData = new URLSearchParams(new FormData(filterForm)).toString();
        const tbody = document.querySelector('tbody');
        const loader = document.getElementById('table-loader');
        
        if(!tbody) return;

        // 🟢 Loader Centering Logic
        if (loader) {
            loader.style.display = 'flex';
            loader.style.flexDirection = 'column';
            loader.style.alignItems = 'center';
            loader.style.justifyContent = 'center';
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
            const res = await fetch(`/sales/all?${formData}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const data = await res.json();
            
            if (data.success) {
                // Update Stats
                const statsPs = document.querySelectorAll('.stat-box p');
                if(statsPs.length >= 5) {
                    statsPs[0].innerText = data.stats.totalSold;
                    statsPs[1].innerText = `Rs ${data.stats.totalRevenue.toLocaleString()}`;
                    statsPs[2].innerText = `Rs ${data.stats.totalProfit.toLocaleString()}`;
                    statsPs[3].innerText = `Rs ${data.stats.totalLoss.toLocaleString()}`;
                    statsPs[4].innerText = `Rs ${data.stats.totalRefunded.toLocaleString()}`;
                }

                // Update Table Rows
                let html = '';
                if (data.sales.length === 0) {
                    html = '<tr><td colspan="12" style="text-align:center; padding:20px;">No records found</td></tr>';
                } else {
                    data.sales.forEach(s => {
                        const dateOptions = { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' };
                        const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' };
                        const dateStr = new Date(s.createdAt).toLocaleDateString('en-GB', dateOptions);
                        const timeStr = new Date(s.createdAt).toLocaleTimeString('en-GB', timeOptions);

                        html += `<tr>
                            <td>${s.brandName}</td>
                            <td>${s.itemName}</td>
                            <td>${s.colourName}</td>
                            <td>${s.qty}</td>
                            <td>${s.quantitySold}</td>
                            <td>Rs ${s.rate.toFixed(2)}</td>
                            <td>Rs ${(s.quantitySold * s.rate).toFixed(2)}</td>
                            <td class="${s.profit < 0 ? 'loss' : 'profit'}">Rs ${s.profit.toFixed(2)}</td>
                            <td class="refund-status">${s.refundStatus || 'none'}</td>
                            <td class="refund-quantity">${s.refundQuantity || 0}</td>
                            <td>${dateStr}<br><small style="color: #007bff; font-weight: bold;">${timeStr}</small></td>
                            <td><button class="delete-sale delete-btn" data-id="${s._id}" id="delete" >Delete</button></td>
                        </tr>`;
                    });
                }
                tbody.innerHTML = html;
                attachDelete();
            }
        } catch (e) { 
            console.error("Fetch Error:", e); 
        } finally { 
            tbody.style.opacity = '1'; 
            if(loader) loader.style.display = 'none';
            if(tableContainer) tableContainer.classList.remove('loading-active');
        }
    }

    // ===================== EVENT LISTENERS =========================
    brandFilter.addEventListener('change', () => { 
        itemFilter.setAttribute('data-selected', 'all');
        syncDropdowns(); 
        updateTable(); 
    });

    itemFilter.addEventListener('change', () => { 
        colourFilter.setAttribute('data-selected', 'all');
        syncColours(); 
        updateTable(); 
    });

    [colourFilter, unitFilter, document.getElementById('refundFilter')].forEach(el => {
        if(el) el.addEventListener('change', updateTable);
    });

    // Custom Date Filter Events
    if (filterSelect) {
        filterSelect.addEventListener('change', () => {
            toggleCustomDates();
            if (filterSelect.value !== 'custom') {
                updateTable();
            }
        });
    }

    if (applyBtn) {
        applyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            updateTable();
        });
    }

    function attachDelete() {
        document.querySelectorAll('.delete-sale').forEach(btn => {
            btn.onclick = async () => {
                if (confirm("⚠️ Are you sure you want to delete this sale record?")) {
                    try {
                        const res = await fetch(`/sales/delete-sale/${btn.dataset.id}`, { 
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' }
                        });
                        const data = await res.json();
                        if (data.success) {
                            alert("✅ Sale deleted successfully!"); 
                            updateTable();
                        } else {
                            alert("❌ Error: " + (data.message || "Could not delete sale"));
                        }
                    } catch (err) {
                        console.error("Delete Error:", err);
                        alert("❌ Server error! Please try again.");
                    }
                }
            };
        });
    }

    // Initial Run
    toggleCustomDates();
    syncDropdowns(true);
    attachDelete();
});
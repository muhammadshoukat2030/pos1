document.addEventListener('DOMContentLoaded', () => {
    const brandSelect = document.getElementById('brandSelect');
    const newBrandInput = document.getElementById('newBrandInput');
    const itemRowsContainer = document.getElementById('itemRowsContainer');
    const addMoreItemsBtn = document.getElementById('addMoreItemsBtn');
    const multiItemWarning = document.getElementById('multiItemWarning');
    const colorsWrapper = document.getElementById('colorsWrapper');
    const submitBtn = document.getElementById('submitBtn');

    // ==========================================
    // 1. TOGGLE SECTIONS (Colors & Units Collapse)
    // ==========================================
    const setupToggle = (headerId, containerId) => {
        const header = document.getElementById(headerId);
        const container = document.getElementById(containerId);
        if (header && container) {
            header.addEventListener('click', () => {
                const isHidden = window.getComputedStyle(container).display === "none";
                container.style.display = isHidden ? "block" : "none";
                header.classList.toggle('collapsed');
            });
        }
    };
    setupToggle('colorHeader', 'colorContainer');
    setupToggle('unitHeader', 'unitContainer');

    // ==========================================
    // 2. CHECK ITEM COUNT (Hide Colors if > 1 Item)
    // ==========================================
    const checkItemCount = () => {
        const count = document.querySelectorAll('.item-entry').length;
        if (count > 1) {
            colorsWrapper.style.display = 'none';
            multiItemWarning.style.display = 'block';
        } else {
            colorsWrapper.style.display = 'block';
            multiItemWarning.style.display = 'none';
        }
    };

    // ==========================================
    // 3. ADD MORE ITEMS LOGIC
    // ==========================================
    if (addMoreItemsBtn) {
        addMoreItemsBtn.addEventListener('click', () => {
            const div = document.createElement('div');
            div.className = 'item-entry';
            div.innerHTML = `
                <input type="text" class="itemNameInput" placeholder="Enter Item Name">
                <button type="button" class="remove-btn">×</button>
            `;
            itemRowsContainer.appendChild(div);
            checkItemCount();
            
            // Remove functionality for this row
            div.querySelector('.remove-btn').addEventListener('click', () => {
                div.remove();
                checkItemCount();
            });
        });
    }

    // ==========================================
    // 4. ADD MORE COLORS LOGIC
    // ==========================================
    const addColorBtn = document.getElementById('addColorBtn');
    const colorRows = document.getElementById('colorRows');
    if (addColorBtn) {
        addColorBtn.addEventListener('click', () => {
            const div = document.createElement('div');
            div.className = 'color-row';
            div.innerHTML = `
                <input type="text" class="color-name" placeholder="Color Name">
                <input type="text" class="color-code" placeholder="Code">
                <button type="button" class="remove-btn">×</button>
            `;
            colorRows.appendChild(div);
            div.querySelector('.remove-btn').addEventListener('click', () => div.remove());
        });
    }

    // ==========================================
    // 5. ADD MORE UNITS LOGIC
    // ==========================================
    const addUnitBtn = document.getElementById('addUnitBtn');
    const unitRows = document.getElementById('unitRows');
    if (addUnitBtn) {
        addUnitBtn.addEventListener('click', () => {
            const div = document.createElement('div');
            div.className = 'unit-row';
            div.innerHTML = `
                <input type="text" class="unit-name" placeholder="Unit (e.g. Gallon)">
                <button type="button" class="remove-btn">×</button>
            `;
            unitRows.appendChild(div);
            div.querySelector('.remove-btn').addEventListener('click', () => div.remove());
        });
    }

    // ==========================================
    // 6. BRAND CHANGE (Fetch existing items)
    // ==========================================
    brandSelect.addEventListener('change', async function() {
        const brand = this.value;
        newBrandInput.style.display = (brand === 'NEW_BRAND') ? 'block' : 'none';

        // Reset the first item select
        const firstSelect = document.querySelector('.itemSelect');
        if (firstSelect) {
            firstSelect.innerHTML = `
                <option value="">Select Item</option>
                <option value="NEW_ITEM" style="font-weight: bold; color: #06a56c;">+ Add New Item</option>
                <option disabled>──────────</option>
            `;
            
            if (brand && brand !== 'NEW_BRAND') {
                try {
                    const response = await fetch(`/dynamic/api/get-items/${brand}`);
                    const items = await response.json();
                    items.forEach(item => {
                        const opt = document.createElement('option');
                        opt.value = item;
                        opt.textContent = item;
                        firstSelect.appendChild(opt);
                    });
                } catch (err) { console.error("Fetch error:", err); }
            }
        }
    });

    // Handle Item Select (Show/Hide Input)
    itemRowsContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('itemSelect')) {
            const input = e.target.parentElement.querySelector('.itemNameInput');
            if (input) {
                input.style.display = (e.target.value === 'NEW_ITEM') ? 'block' : 'none';
            }
        }
    });

    // ==========================================
    // 7. SUBMIT & SAVE TO DATABASE
    // ==========================================
    submitBtn.addEventListener('click', async () => {
        const selectedBrand = brandSelect.value;
        const brandName = (selectedBrand === 'NEW_BRAND') ? newBrandInput.value.trim() : selectedBrand;
        
        // Collect all items from entries
        const items = [];
        document.querySelectorAll('.item-entry').forEach(entry => {
            const sel = entry.querySelector('.itemSelect');
            const inp = entry.querySelector('.itemNameInput');
            
            // Agar select box hai to uski value, warna direct input ki value
            let val = "";
            if (sel && sel.value !== 'NEW_ITEM' && sel.value !== "") {
                val = sel.value;
            } else if (inp) {
                val = inp.value.trim();
            }
            
            if (val) items.push(val);
        });

        if (!brandName || items.length === 0) {
            alert("Bhai, Brand aur kam az kam ek Item lazmi hai!");
            return;
        }

        // Collect Colors (Only if 1 item is being added)
        const colors = [];
        if (items.length === 1) {
            document.querySelectorAll('.color-row').forEach(row => {
                const name = row.querySelector('.color-name').value.trim();
                const code = row.querySelector('.color-code').value.trim();
                if (name) colors.push({ colour: name, code: code });
            });
        }

        // Collect Units
        const units = [];
        document.querySelectorAll('.unit-name').forEach(input => {
            const val = input.value.trim();
            if (val) units.push(val);
        });

        // UI Feedback
        submitBtn.disabled = true;
        submitBtn.innerText = "Saving...";

        try {
            const response = await fetch('/dynamic/add-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brandName, itemsList: items, colors, units })
            });
            const result = await response.json();
            if (result.success) {
                alert("✅ Data updated successfully ");
                window.location.reload();
            } else {
                alert("❌ Error: " + result.message);
            }
        } catch (err) {
            alert("❌ Server connection failed!");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Submit & Save";
        }
    });
});




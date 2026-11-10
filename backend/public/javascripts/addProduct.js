document.addEventListener('DOMContentLoaded', () => {
    const dataProvider = document.getElementById('db-data-provider');
    let dbDefinitions = [];
    
    if (dataProvider) {
        try {
            const rawData = dataProvider.getAttribute('data-definitions');
            dbDefinitions = JSON.parse(rawData || "[]");
        } catch (e) {
            console.error("Data parsing error:", e);
        }
    }

    const brandNameSelect = document.getElementById("brandName");
    const itemNameSelect = document.getElementById("itemName");
    const quantitativeSelect = document.getElementById("quantitative");
    const colourCodeSelect = document.getElementById("colourCode");
    const addBtn = document.getElementById("add");
    const submitBtn = document.querySelector(".submit-btn");

    let tempProducts = [];

    // --- Brand Change ---
    brandNameSelect.addEventListener("change", function () {
        const selectedBrand = this.value;
        itemNameSelect.innerHTML = `<option value="">Select Item</option>`;
        quantitativeSelect.innerHTML = `<option value="">Select Unit</option>`;
        colourCodeSelect.innerHTML = `<option value="">Select Colour</option>`;
        colourCodeSelect.disabled = true;

        if (!selectedBrand) return;
        const brandData = dbDefinitions.find(d => d.brandName === selectedBrand);

        if (brandData) {
            if (brandData.units) {
                brandData.units.forEach(unit => {
                    const opt = document.createElement("option");
                    opt.value = unit; opt.textContent = unit;
                    quantitativeSelect.appendChild(opt);
                });
            }
            if (brandData.products) {
                brandData.products.forEach(p => {
                    if (p.itemName) {
                        const opt = document.createElement("option");
                        opt.value = p.itemName; opt.textContent = p.itemName;
                        itemNameSelect.appendChild(opt);
                    }
                });
            }
        }
    });

    // --- Item Change ---
    itemNameSelect.addEventListener("change", function () {
        const selectedBrand = brandNameSelect.value;
        const selectedItemName = this.value;
        const brandData = dbDefinitions.find(d => d.brandName === selectedBrand);

        colourCodeSelect.innerHTML = '<option value="">Select Colour</option>';
        colourCodeSelect.disabled = true;

        if (brandData && brandData.products) {
            const selectedProduct = brandData.products.find(p => p.itemName === selectedItemName);
            if (selectedProduct && selectedProduct.colors && selectedProduct.colors.length > 0) {
                selectedProduct.colors.forEach(c => {
                    const opt = document.createElement("option");
                    const displayValue = c.code ? `${c.colour} (Code: ${c.code})` : c.colour;
                    opt.value = displayValue; opt.textContent = displayValue;
                    colourCodeSelect.appendChild(opt);
                });
                colourCodeSelect.disabled = false;
            } else {
                const opt = document.createElement("option");
                opt.value = ""; opt.textContent = "No Colors Available";
                colourCodeSelect.appendChild(opt);
            }
        }
    });

    // --- Table Render ---
    function renderTable() {
        const tbody = document.getElementById("tableBody");
        tbody.innerHTML = ""; 

        if (tempProducts.length === 0) {
            tbody.innerHTML = `<tr><td  color: #888; padding: 20px;">No products added yet.</td></tr>`;
            return;
        }

        tempProducts.forEach((p, i) => {
            const row = `<tr>
                <td>${p.brandName}</td>
                <td>${p.itemName}</td>
                <td>${p.colourName}</td> 
                <td>${p.qty}</td>
                <td>${p.totalProduct}</td>
                <td>Rs ${p.rate.toLocaleString()}</td>
                <td>Rs ${p.total.toLocaleString()}</td>
                <td><button type="button" class="delete-btn" data-index="${i}" id="delete" >Delete</button></td>
            </tr>`;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    }

    // --- Delete Logic (Event Delegation) ---
    const tableBody = document.getElementById("tableBody");
    tableBody.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-btn")) {
            const index = e.target.getAttribute("data-index");
            tempProducts.splice(index, 1);
            renderTable();
        }
    });

    // --- Add Product ---
    function addProduct() {
        const brandName = brandNameSelect.value;
        const itemName = itemNameSelect.value;
        const colourName = colourCodeSelect.value;
        const qty = quantitativeSelect.value;
        const totalProduct = parseInt(document.getElementById("totalProduct").value);
        const rate = parseFloat(document.getElementById("rate").value);

        if (!brandName || !itemName || isNaN(totalProduct) || isNaN(rate)) {
            alert("⚠️ Please fill all fields (Brand, Item, Qty, Rate)!");
            return;
        }

        const stockID = `${itemName.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}`;

        tempProducts.push({
            stockID, brandName, itemName, colourName: colourName , 
            qty, totalProduct, rate, total: (totalProduct * rate)
        });

        renderTable();
        document.getElementById("totalProduct").value = "";
        document.getElementById("rate").value = "";
    }

    // --- Submit Data ---
    async function submitData() {
        if (tempProducts.length === 0) return alert("Add items to the table first!");
        submitBtn.disabled = true;
        submitBtn.innerHTML = "Saving...";
        try {
            const res = await fetch("/products/add-multiple", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ products: tempProducts }),
            });
            const data = await res.json();
            if (data.success) {
                alert("✅ All products saved successfully!");
                localStorage.setItem("lastAddedProducts", JSON.stringify(tempProducts));
                window.open(`/products/print`, "_blank");
                location.reload(); 
            } else {
                alert("❌ Error: " + data.message);
            }
        } catch (err) { 
            alert("Network Error: Could not save products."); 
        } finally { 
            submitBtn.disabled = false; 
            submitBtn.innerHTML = "Submit & Save";
        }
    }

    addBtn.addEventListener("click", addProduct);
    submitBtn.addEventListener("click", submitData);
    renderTable();
});
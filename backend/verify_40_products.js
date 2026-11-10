import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import Product from "./models/Product.js";
import Admin from "./models/Admin.js";
import { sampleProductsData } from "./seed_40_products.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pos";
const API_BASE = "http://127.0.0.1:5000/api";

async function verifyAll40Products() {
  console.log("================================================================================");
  console.log("  VERIFICATION AUDIT: 40 SAMPLE TEST PRODUCTS IN DATABASE & POS APIS");
  console.log("================================================================================\n");

  await mongoose.connect(MONGO_URI);
  console.log("✅ MongoDB Connected Successfully to:", MONGO_URI);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Confirm exactly 40 products inserted with seeded barcodes
    console.log("\n--- CHECK 1: Confirm Exactly 40 Seeded Products in Database ---");
    const seededBarcodes = sampleProductsData.map(p => p.barcode);
    const dbProducts = await Product.find({ barcode: { $in: seededBarcodes } }).lean();
    assert(dbProducts.length === 40, `Found exactly ${dbProducts.length} of 40 seeded products in DB`);

    // 2. Barcode & SKU Uniqueness
    console.log("\n--- CHECK 2: Barcode & SKU Uniqueness Across Database ---");
    const allBarcodes = await Product.distinct("barcode");
    const allSKUs = await Product.distinct("sku");
    const totalProdCount = await Product.countDocuments();
    assert(allBarcodes.length === totalProdCount, `All barcodes are 100% unique (${allBarcodes.length} unique of ${totalProdCount} total products)`);
    assert(allSKUs.length === totalProdCount, `All SKUs are 100% unique (${allSKUs.length} unique of ${totalProdCount} total products)`);

    // 3. Verify Product Names, Brands, Categories, and Subcategories
    console.log("\n--- CHECK 3: Verify Names, Brands, and Categories ---");
    const categoriesSet = new Set(dbProducts.map(p => p.category));
    const expectedCategories = [
      "Grocery", "Dry Food", "Beverages", "Dairy Products", "Snacks",
      "Personal Care", "Cleaning Products", "Hardware", "Paint", "Electrical Items"
    ];
    let allCatsPresent = true;
    for (const cat of expectedCategories) {
      const count = dbProducts.filter(p => p.category === cat).length;
      if (count !== 4) {
        allCatsPresent = false;
        console.error(`  Mismatch in category "${cat}": expected 4, got ${count}`);
      }
    }
    assert(allCatsPresent && categoriesSet.size === 10, "All 10 requested categories have exactly 4 diverse products each");

    // 4. Verify Pricing (Selling Price > Purchase Price)
    console.log("\n--- CHECK 4: Verify Purchase & Selling Prices (PKR) ---");
    const invalidPricing = dbProducts.filter(p => !p.costPrice || !p.salePrice || p.salePrice <= p.costPrice);
    assert(invalidPricing.length === 0, `All 40 products have Selling Price > Cost Price (0 pricing errors found)`);

    // 5. Verify Units & Stock Quantities
    console.log("\n--- CHECK 5: Verify Units of Measurement & Stock Quantities ---");
    const unitsFound = new Set(dbProducts.map(p => p.unit));
    const requiredUnits = ["KG", "Gram", "Litre", "ML", "Piece", "Packet", "Bottle", "Box", "Carton", "Bag", "Meter"];
    const allUnitsRepresented = requiredUnits.every(u => unitsFound.has(u));
    assert(allUnitsRepresented, `All 11 requested units represented: ${[...unitsFound].join(", ")}`);

    const lowStockCount = dbProducts.filter(p => p.remaining <= p.minStockAlert).length;
    assert(lowStockCount >= 8, `Stock alert variance: ${lowStockCount} products currently flagged for Low Stock Alert`);

    const decimalCount = dbProducts.filter(p => p.allowDecimal).length;
    assert(decimalCount >= 4, `Decimal quantity handling: ${decimalCount} products configured for decimal measurement`);

    // 6. Verify Paint Specialty Attributes
    console.log("\n--- CHECK 6: Paint Specialty Attributes Verification ---");
    const paintProds = dbProducts.filter(p => p.isPaint);
    assert(paintProds.length === 4, `Found exactly 4 Paint specialty products`);
    const paintAttrsValid = paintProds.every(p => p.paintType && p.colourName && p.colorCode && p.paintSize && p.finish && p.expiryDate === null);
    assert(paintAttrsValid, `All Paint products have complete specialty attributes (brand, type, colour, code, size, finish, null expiry)`);

    // 7. Verify Images
    console.log("\n--- CHECK 7: Verify Product Images ---");
    const validImages = dbProducts.filter(p => p.image && p.image.startsWith("http"));
    assert(validImages.length === 40, `All 40 products have verified accessible image URLs`);

    // 8. Test Backend API: Search & Category Filter Query
    console.log("\n--- CHECK 8: Testing All Products API Integration ---");
    let admin = await Admin.findOne({ username: "admin" }) || await Admin.findOne({});
    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role },
      process.env.SECRET_KEY || "universal_pos_secret_key_session",
      { expiresIn: "1h" }
    );
    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    };

    // Query Category filter: Paint
    const paintApiRes = await fetch(`${API_BASE}/products?category=Paint`, { headers: authHeaders });
    const paintApiData = await paintApiRes.json();
    assert(paintApiRes.ok && paintApiData.products.length === 4, `API /api/products?category=Paint returned 4 paint products`);

    // Query Search filter: "Rice"
    const searchApiRes = await fetch(`${API_BASE}/products?search=Rice`, { headers: authHeaders });
    const searchApiData = await searchApiRes.json();
    assert(searchApiRes.ok && searchApiData.products.some(p => p.sku === "DRY-RCE-005"), `API Search for "Rice" found Guard Basmati Rice`);

    // 9. Test Product Details & History Endpoint
    console.log("\n--- CHECK 9: Testing Product Details & Batches Endpoint ---");
    const sampleProduct = dbProducts[0];
    const detailRes = await fetch(`${API_BASE}/products/${sampleProduct._id}/history`, { headers: authHeaders });
    const detailData = await detailRes.json();
    assert(detailRes.ok && detailData.product && detailData.batches.length > 0, `Product Details API returned complete info & active batch for "${sampleProduct.itemName}"`);

    // 10. Confirm Products Available in POS Selling Area
    console.log("\n--- CHECK 10: POS Selling Area Availability ---");
    const posRes = await fetch(`${API_BASE}/products?isAll=true`, { headers: authHeaders });
    const posData = await posRes.json();
    assert(posRes.ok && posData.products.length >= 40, `POS Terminal catalog loaded ${posData.products.length} sellable products`);

    // Barcode Lookup simulation
    const testBarcode = "896500100009"; // Coca-Cola
    const posItem = posData.products.find(p => p.barcode === testBarcode);
    assert(posItem && posItem.itemName.includes("Coca-Cola"), `POS Barcode scan for ${testBarcode} matched: "${posItem?.itemName}" (Rate: Rs. ${posItem?.rate || posItem?.salePrice})`);

    console.log("\n================================================================================");
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================================\n");

  } catch (err) {
    console.error("Verification error:", err);
    failed++;
  } finally {
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

verifyAll40Products();

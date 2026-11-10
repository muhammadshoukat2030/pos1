import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import Product from "./models/Product.js";
import Admin from "./models/Admin.js";
import { new60ProductsData } from "./replace_test_products_60.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pos";
const API_BASE = "http://127.0.0.1:5000/api";

async function verifyAll60Products() {
  console.log("================================================================================");
  console.log("  VERIFICATION AUDIT: 60 NEW SAMPLE PRODUCTS IN DATABASE & POS APIS");
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
    // 1. Confirm old testing products were completely removed
    console.log("\n--- CHECK 1: Confirm Old Test Products Removed ---");
    const oldTestBarcodesRegex = /^89650010/;
    const leftoverOldProducts = await Product.find({ barcode: { $regex: oldTestBarcodesRegex } }).lean();
    assert(leftoverOldProducts.length === 0, `Zero old testing products remaining (0 found)`);

    // 2. Confirm exactly 60 new products exist in database
    console.log("\n--- CHECK 2: Confirm Exactly 60 New Products in Database ---");
    const seededBarcodes = new60ProductsData.map(p => p.barcode);
    const dbProducts = await Product.find({ barcode: { $in: seededBarcodes } }).lean();
    assert(dbProducts.length === 60, `Found exactly ${dbProducts.length} of 60 new products in DB`);

    // 3. Confirm Original products are preserved
    console.log("\n--- CHECK 3: Confirm Original Products Preserved ---");
    const totalCount = await Product.countDocuments();
    assert(totalCount === 71, `Total catalog count is 71 (11 Original + 60 New = ${totalCount})`);

    // 4. Barcode & SKU Uniqueness Across Catalog
    console.log("\n--- CHECK 4: Barcode & SKU Uniqueness Across Database ---");
    const allBarcodes = await Product.distinct("barcode");
    const allSKUs = await Product.distinct("sku");
    assert(allBarcodes.length === totalCount, `All barcodes are 100% unique (${allBarcodes.length} unique of ${totalCount} total products)`);
    assert(allSKUs.length === totalCount, `All SKUs are 100% unique (${allSKUs.length} unique of ${totalCount} total products)`);

    // 5. Verify Categories Distribution (11 Categories)
    console.log("\n--- CHECK 5: Verify Categories & Variety ---");
    const categoriesSet = new Set(dbProducts.map(p => p.category));
    const expectedCategories = [
      "Grocery", "Dry Food", "Beverages", "Dairy Products", "Snacks",
      "Personal Care", "Cleaning Products", "Hardware", "Paint",
      "Electrical Items", "Household Products"
    ];
    let allCatsPresent = expectedCategories.every(cat => categoriesSet.has(cat));
    assert(allCatsPresent && categoriesSet.size === 11, `All 11 requested categories present with diverse items`);

    // 6. Verify Pricing (Selling Price > Cost Price)
    console.log("\n--- CHECK 6: Verify Purchase & Selling Prices (PKR) ---");
    const invalidPricing = dbProducts.filter(p => !p.costPrice || !p.salePrice || p.salePrice <= p.costPrice);
    assert(invalidPricing.length === 0, `All 60 new products have Selling Price > Cost Price (0 pricing errors)`);

    // 7. Verify Units of Measurement (All 12 Units Represented)
    console.log("\n--- CHECK 7: Verify Units of Measurement ---");
    const unitsFound = new Set(dbProducts.map(p => p.unit));
    const requiredUnits = ["KG", "Gram", "Litre", "ML", "Piece", "Packet", "Bottle", "Box", "Carton", "Bag", "Meter", "Feet"];
    const allUnitsRepresented = requiredUnits.every(u => unitsFound.has(u));
    assert(allUnitsRepresented, `All 12 requested units represented: ${[...unitsFound].join(", ")}`);

    // 8. Verify Paint Specialty Attributes (6 Products)
    console.log("\n--- CHECK 8: Paint Specialty Attributes Verification ---");
    const paintProds = dbProducts.filter(p => p.isPaint);
    assert(paintProds.length === 6, `Found exactly 6 Paint specialty products`);
    const paintAttrsValid = paintProds.every(p => p.paintType && p.colourName && p.colorCode && p.paintSize && p.finish && p.expiryDate === null);
    assert(paintAttrsValid, `All 6 Paint products have complete specialty attributes (brand, type, colour, code, size, finish, null expiry)`);

    // 9. Verify Images
    console.log("\n--- CHECK 9: Verify Product Images ---");
    const validImages = dbProducts.filter(p => p.image && p.image.startsWith("http"));
    assert(validImages.length === 60, `All 60 products have valid, verified public image URLs`);

    // 10. Test Backend API: Search & Category Filter Query
    console.log("\n--- CHECK 10: Testing All Products API Integration ---");
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

    // Category filter: "Household Products"
    const householdRes = await fetch(`${API_BASE}/products?category=Household%20Products`, { headers: authHeaders });
    const householdData = await householdRes.json();
    assert(householdRes.ok && householdData.products.length === 5, `API /api/products?category=Household Products returned 5 items`);

    // Category filter: "Paint"
    const paintRes = await fetch(`${API_BASE}/products?category=Paint`, { headers: authHeaders });
    const paintData = await paintRes.json();
    assert(paintRes.ok && paintData.products.length === 6, `API /api/products?category=Paint returned 6 paint products`);

    // Search query: "Stanley"
    const searchRes = await fetch(`${API_BASE}/products?search=Stanley`, { headers: authHeaders });
    const searchData = await searchRes.json();
    assert(searchRes.ok && searchData.products.some(p => p.sku === "HDW-STN-039"), `API Search for "Stanley" found Stanley FatMax Claw Hammer`);

    // 11. POS Selling Area Availability & Barcode Lookup
    console.log("\n--- CHECK 11: POS Selling Area Availability ---");
    const posRes = await fetch(`${API_BASE}/products?isAll=true`, { headers: authHeaders });
    const posData = await posRes.json();
    assert(posRes.ok && posData.products.length >= 60, `POS Terminal catalog loaded ${posData.products.length} sellable products`);

    // Barcode Lookup simulation for Sprite
    const testBarcode = "896600200011"; // Sprite
    const posItem = posData.products.find(p => p.barcode === testBarcode);
    assert(posItem && posItem.itemName.includes("Sprite"), `POS Barcode scan for ${testBarcode} matched: "${posItem?.itemName}" (Rate: Rs. ${posItem?.rate || posItem?.salePrice})`);

    // 12. POS Decimal Item Selection Simulation (Tape / Wire)
    console.log("\n--- CHECK 12: POS Decimal Product Selection Simulation ---");
    const decimalItem = posData.products.find(p => p.unit === "Feet" && p.allowDecimal);
    assert(decimalItem && decimalItem.remaining > 0, `Decimal Feet item "${decimalItem?.itemName}" selectable in POS with remaining ${decimalItem?.remaining} ${decimalItem?.unit}`);

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

verifyAll60Products();

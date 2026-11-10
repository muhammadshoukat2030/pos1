import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import Product from "./models/Product.js";
import Admin from "./models/Admin.js";
import { paintShopProductsData } from "./seed_paint_shop_products.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pos";
const API_BASE = "http://127.0.0.1:5000/api";

async function verifyPaintShopDataset() {
  console.log("================================================================================");
  console.log("  VERIFICATION AUDIT: 71 COMPLETE PAINT SHOP PRODUCTS DATASET & POS APIS");
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
    const seededBarcodes = paintShopProductsData.map(p => p.barcode);
    const paintProds = await Product.find({ barcode: { $in: seededBarcodes } }).lean();

    // 1. Verify Count (At least 60 products)
    console.log("\n--- CHECK 1: Verify Paint Products Count (>= 60) ---");
    assert(paintProds.length >= 60, `Found ${paintProds.length} paint shop products in database (Expected >= 60)`);

    // 2. Total Catalog Integrity (Preserving previous items)
    console.log("\n--- CHECK 2: Total Store Catalog Count ---");
    const totalCount = await Product.countDocuments();
    assert(totalCount === 142, `Total catalog count is 142 (71 Previous + 71 Paint = ${totalCount})`);

    // 3. Barcode & SKU Uniqueness
    console.log("\n--- CHECK 3: Barcode & SKU Uniqueness Across Entire Catalog ---");
    const allBarcodes = await Product.distinct("barcode");
    const allSKUs = await Product.distinct("sku");
    assert(allBarcodes.length === totalCount, `All barcodes are 100% unique (${allBarcodes.length} unique of ${totalCount})`);
    assert(allSKUs.length === totalCount, `All SKUs are 100% unique (${allSKUs.length} unique of ${totalCount})`);

    // 4. Verify Major Paint Brands
    console.log("\n--- CHECK 4: Verify Major Paint Brands ---");
    const requiredBrands = [
      "Master Paints", "Berger Paints", "Dulux Paints", "Nippon Paints",
      "Jotun Paints", "Brighto Paints", "Diamond Paints", "Happilac Paints"
    ];
    const brandsInPaint = new Set(paintProds.map(p => p.brandName));
    const allBrandsPresent = requiredBrands.every(b => brandsInPaint.has(b));
    assert(allBrandsPresent, `All major requested paint brands present: ${requiredBrands.join(", ")}`);

    // 5. Verify Paint Types
    console.log("\n--- CHECK 5: Verify Diverse Paint Types ---");
    const paintTypesFound = new Set(paintProds.map(p => p.paintType).filter(Boolean));
    const expectedPaintTypes = [
      "Plastic Emulsion", "Weather Shield Paint", "Synthetic Enamel",
      "Wood Paint", "Metal Paint", "Anti-Rust Paint", "Epoxy Paint",
      "Ceiling Paint", "Varnish", "Wood Polish", "Lacquer", "Spray Paint",
      "Acrylic Wall Putty", "Powder Putty"
    ];
    const hasDiverseTypes = expectedPaintTypes.every(t => paintTypesFound.has(t));
    assert(hasDiverseTypes, `All required paint types found (${paintTypesFound.size} types represented)`);

    // 6. Verify Colour Spectrum & Shade Codes
    console.log("\n--- CHECK 6: Verify Colours & Shade Codes ---");
    const coloursFound = new Set(paintProds.map(p => p.colourName).filter(Boolean));
    const expectedColours = [
      "Pure White", "Off White", "Ivory", "Cream", "Beige", "Light Grey", "Dark Grey",
      "Charcoal", "Black", "Red", "Maroon", "Navy Blue", "Sky Blue", "Dark Green",
      "Green", "Yellow", "Orange", "Brown", "Chocolate", "Pink", "Purple", "Silver", "Gold"
    ];
    const coloursCheck = expectedColours.every(c => coloursFound.has(c));
    assert(coloursCheck, `All 23 requested colour shades represented across the paint line`);

    const sampleCodesValid = paintProds.filter(p => p.isPaint).every(p => p.colorCode && p.shadeNumber);
    assert(sampleCodesValid, `Every paint product has explicit, designated sample shade code & number`);

    // 7. Verify Sizes & Packaging
    console.log("\n--- CHECK 7: Verify Sizes and Packaging Types ---");
    const sizesFound = new Set(paintProds.map(p => p.paintSize).filter(Boolean));
    const expectedSizes = ["250 ML", "500 ML", "1 Litre", "3 Litres", "4 Litres", "5 Litres", "16 Litres", "18 Litres", "20 Litres", "1 Gallon (3.78L)", "Quarter (0.91L)"];
    const sizesCheck = expectedSizes.every(s => sizesFound.has(s));
    assert(sizesCheck, `All requested volume sizes represented (${expectedSizes.join(", ")})`);

    // 8. Verify Wall Preparation, Thinners & Tools
    console.log("\n--- CHECK 8: Verify Wall Preparation, Thinners & Painting Tools ---");
    const wallPrepCount = paintProds.filter(p => p.category === "Wall Preparation").length;
    const thinnersCount = paintProds.filter(p => p.category === "Paint Thinners").length;
    const toolsCount = paintProds.filter(p => p.category === "Paint Tools & Accessories").length;
    assert(wallPrepCount === 7, `Wall Preparation (Putty, White Cement, Crack Filler, Sealer) has ${wallPrepCount} items`);
    assert(thinnersCount === 5, `Paint Thinners (Synthetic, NC, Turpentine, Paint Remover, Rust Converter) has ${thinnersCount} items`);
    assert(toolsCount === 13, `Paint Tools & Sundries (Brushes, Rollers, Trays, Knives, Tape, Sandpaper, Masks) has ${toolsCount} items`);

    // 9. Pricing Integrity (Cost < Sale)
    console.log("\n--- CHECK 9: Pricing Integrity ---");
    const invalidPricing = paintProds.filter(p => !p.costPrice || !p.salePrice || p.salePrice <= p.costPrice);
    assert(invalidPricing.length === 0, `All 71 products have Selling Price > Cost Price`);

    // 10. Images Verified
    console.log("\n--- CHECK 10: Product Images ---");
    const validImages = paintProds.filter(p => p.image && p.image.startsWith("http"));
    assert(validImages.length === 71, `All 71 products have valid verified public images`);

    // 11. Testing Backend API: Category & Brand Filters
    console.log("\n--- CHECK 11: Testing API Filter Integration ---");
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

    // Filter by Brand: "Master Paints"
    const masterRes = await fetch(`${API_BASE}/products?brand=Master%20Paints&all=true`, { headers: authHeaders });
    const masterData = await masterRes.json();
    assert(masterRes.ok && masterData.products.length >= 8, `API filter by brand "Master Paints" returned ${masterData.products.length} products`);

    // Filter by Category: "Paint Thinners"
    const thinnerRes = await fetch(`${API_BASE}/products?category=Paint%20Thinners`, { headers: authHeaders });
    const thinnerData = await thinnerRes.json();
    assert(thinnerRes.ok && thinnerData.products.length === 5, `API filter by category "Paint Thinners" returned 5 products`);

    // Filter by Low Stock
    const lowStockRes = await fetch(`${API_BASE}/products?stockStatus=low&all=true`, { headers: authHeaders });
    const lowStockData = await lowStockRes.json();
    assert(lowStockRes.ok && lowStockData.products.length >= 10, `API low stock filter returned ${lowStockData.products.length} alert items`);

    // Search Query: "WeatherCoat"
    const searchRes = await fetch(`${API_BASE}/products?search=WeatherCoat`, { headers: authHeaders });
    const searchData = await searchRes.json();
    assert(searchRes.ok && searchData.products.some(p => p.sku === "PNT-EXT-011"), `API Search for "WeatherCoat" found Berger WeatherCoat`);

    // 12. POS Terminal Catalog Availability & Barcode Scanning Simulation
    console.log("\n--- CHECK 12: POS Selling Area Integration ---");
    const posRes = await fetch(`${API_BASE}/products?isAll=true`, { headers: authHeaders });
    const posData = await posRes.json();
    assert(posRes.ok && posData.products.length >= 142, `POS Catalog loaded ${posData.products.length} sellable products`);

    // Scan Master Super Emulsion Pure White (896700300001)
    const scanBarcode = "896700300001";
    const posItem = posData.products.find(p => p.barcode === scanBarcode);
    assert(posItem && posItem.itemName.includes("Master Super Emulsion"), `POS Barcode Scan for ${scanBarcode} matched "${posItem?.itemName}" (Rate: Rs. ${posItem?.rate || posItem?.salePrice})`);

    // Verify Paint specialty attributes exist on POS item object
    assert(posItem?.isPaint && posItem?.colorCode && posItem?.paintSize, `POS item includes paint specialty properties for cashier reference`);

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

verifyPaintShopDataset();

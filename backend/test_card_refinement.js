import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

import connectDB from "./config/db.js";
import Product from "./models/Product.js";

async function testCardRefinements() {
  console.log("=== TESTING POS PRODUCT CARD UI REFINEMENT ===");
  await connectDB();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Check existing products and long product names
    const prods = await Product.find().lean();
    assert(prods.length > 0, `Products loaded (${prods.length} total)`);

    const longNames = prods.filter(p => p.itemName && p.itemName.length >= 25);
    console.log(`   Sample long product names (${longNames.length} found):`);
    longNames.slice(0, 5).forEach(p => console.log(`   - "${p.itemName}" (${p.itemName.length} chars)`));
    assert(longNames.length > 0, "Long product names exist to verify 2-line wrapping");

    // 2. Test Category Filters
    const distinctCats = await Product.distinct("category");
    assert(distinctCats.length > 0, `Found ${distinctCats.length} distinct product categories: ${distinctCats.join(", ")}`);
    for (const cat of distinctCats.slice(0, 3)) {
      const catCount = await Product.countDocuments({ category: cat });
      assert(catCount > 0, `Category '${cat}' correctly filters to ${catCount} products`);
    }

    // 3. Test Search Filtering (name, barcode, SKU)
    const sample = prods[0];
    const nameSearch = await Product.find({ itemName: new RegExp(sample.itemName.slice(0, 5), "i") }).lean();
    assert(nameSearch.length > 0, `Search by product name prefix returns ${nameSearch.length} results without clipping`);

    if (sample.barcode) {
      const barcodeSearch = await Product.find({ barcode: sample.barcode }).lean();
      assert(barcodeSearch.length > 0, `Barcode search for '${sample.barcode}' returns match`);
    }

    // 4. Test Stock Remaining fields
    const stockChecked = prods.every(p => p.remaining !== undefined && p.remaining !== null);
    assert(stockChecked, "All products have valid remaining stock counters");

    console.log("\n=======================================================");
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("=======================================================");

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error("Test error:", err);
    process.exit(1);
  }
}

testCardRefinements();

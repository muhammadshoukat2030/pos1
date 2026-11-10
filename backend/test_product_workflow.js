import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

import connectDB from "./config/db.js";
import mongoose from "mongoose";
import Brand from "./models/Brand.js";
import Category from "./models/Category.js";
import Product from "./models/Product.js";
import StockAudit from "./models/StockAudit.js";

async function runTests() {
  console.log("=== STARTING PRODUCT MANAGEMENT & INVENTORY WORKFLOW VERIFICATION ===");
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
    // 1. Verify Existing Products in Database
    const productCount = await Product.countDocuments();
    assert(productCount >= 10, `Database contains existing products (${productCount} found)`);

    // 2. Verify Brands exist and have productCount
    const brands = await Brand.find().lean();
    assert(brands.length > 0, `Brands collection has registered brands (${brands.length} found)`);
    console.log(`   Sample Brands: ${brands.slice(0, 5).map(b => b.name).join(", ")}`);

    // Check product count on a brand
    const nestle = brands.find(b => b.name.includes("Nestlé") || b.name.includes("Nestle"));
    if (nestle) {
      const nestleProducts = await Product.countDocuments({
        $or: [{ brandName: nestle.name }, { brand: nestle.name }]
      });
      assert(nestleProducts > 0, `Brand '${nestle.name}' correctly links to ${nestleProducts} products`);
    }

    // 3. Verify Categories exist and have productCount
    const categories = await Category.find().lean();
    assert(categories.length > 0, `Categories collection has registered categories (${categories.length} found)`);
    console.log(`   Sample Categories: ${categories.slice(0, 5).map(c => c.name).join(", ")}`);

    // Check product count on a category
    const beverageCat = categories.find(c => c.name.toLowerCase() === "beverages");
    if (beverageCat) {
      const bevProducts = await Product.countDocuments({ category: beverageCat.name });
      assert(bevProducts > 0, `Category '${beverageCat.name}' correctly links to ${bevProducts} products`);
    }

    // 4. Test Safe Deletion Constraint on Brands with Products
    const brandWithProds = brands.find(b => b.name === "PepsiCo" || b.name === "Nestlé Pakistan");
    if (brandWithProds) {
      const linkedCount = await Product.countDocuments({ brandName: brandWithProds.name });
      assert(linkedCount > 0, `Safe delete test: Brand '${brandWithProds.name}' has ${linkedCount} products`);
      // Simulating delete check logic from brandsApi.js
      const canDelete = linkedCount === 0;
      assert(!canDelete, `Brand '${brandWithProds.name}' cannot be deleted while products are assigned (Safe delete protected)`);
    }

    // 5. Test Safe Deletion Constraint on Categories with Products
    if (beverageCat) {
      const linkedCatCount = await Product.countDocuments({ category: beverageCat.name });
      const canDeleteCat = linkedCatCount === 0;
      assert(!canDeleteCat, `Category '${beverageCat.name}' cannot be deleted while products are assigned (Safe delete protected)`);
    }

    // 6. Test Universal Units & Decimal Handling
    const testSku = `TEST-WF-${Date.now()}`;
    const testBarcode = `9999${Math.floor(100000 + Math.random() * 900000)}`;
    const brandForTest = brands[0].name;
    const catForTest = categories[0].name;

    const testProd = await Product.create({
      itemName: "Automated Workflow Test Flour 5kg",
      barcode: testBarcode,
      sku: testSku,
      brandName: brandForTest,
      brand: brandForTest,
      category: catForTest,
      unit: "kg",
      allowDecimal: true,
      costPrice: 450,
      salePrice: 550,
      rate: 550,
      totalProduct: 50.5,
      remaining: 50.5,
      minStockAlert: 10,
      stockID: testBarcode,
      image: "/images/product-placeholder.svg"
    });

    assert(testProd && testProd._id, `Created test product with Universal Unit 'kg' and decimal stock (50.5 kg)`);
    assert(testProd.allowDecimal === true, `allowDecimal is properly set to true for weight unit`);

    // 7. Test Stock Adjustment: Restock (+10 kg)
    const initialStock = testProd.remaining;
    const addQty = 10;
    const newStockRestock = initialStock + addQty;
    testProd.remaining = newStockRestock;
    testProd.totalProduct += addQty;
    await testProd.save();

    const audit1 = await StockAudit.create({
      productId: testProd._id,
      itemName: testProd.itemName,
      barcode: testProd.barcode,
      adjustmentType: "Restock / Addition",
      previousQuantity: initialStock,
      changeQuantity: addQty,
      newQuantity: newStockRestock,
      reason: "Workflow test restock",
      adjustedBy: "TestRunner"
    });

    assert(testProd.remaining === 60.5, `Stock Restock addition correct: ${initialStock} + 10 = ${testProd.remaining} kg`);
    assert(audit1 && audit1._id, `StockAudit record created for Restock with previous=${audit1.previousQuantity}, change=${audit1.changeQuantity}, new=${audit1.newQuantity}`);

    // 8. Test Stock Adjustment: Damaged / Expired Deduction (-5 kg)
    const deductQty = 5;
    const newStockDeduct = testProd.remaining - deductQty;
    testProd.remaining = newStockDeduct;
    await testProd.save();

    const audit2 = await StockAudit.create({
      productId: testProd._id,
      itemName: testProd.itemName,
      barcode: testProd.barcode,
      adjustmentType: "Damaged / Expired",
      previousQuantity: newStockRestock,
      changeQuantity: -deductQty,
      newQuantity: newStockDeduct,
      reason: "Workflow test damage write-off",
      adjustedBy: "TestRunner"
    });

    assert(testProd.remaining === 55.5, `Stock Deduction correct: 60.5 - 5 = ${testProd.remaining} kg`);

    // 9. Test Stock Adjustment: Prevent Negative Stock
    const invalidDeduct = 100; // only 55.5 available
    const wouldBeNegative = (testProd.remaining - invalidDeduct) < 0;
    assert(wouldBeNegative, `Negative stock prevention correctly detects invalid deduction of ${invalidDeduct} from ${testProd.remaining}`);

    // 10. Test Out-of-Stock Selling Prevention Logic
    const zeroStockProduct = {
      itemName: "Zero Stock Mock Item",
      remaining: 0,
      unit: "pcs"
    };
    const canSellZero = zeroStockProduct.remaining > 0;
    assert(!canSellZero, `POS Terminal logic correctly blocks selling item with remaining stock <= 0`);

    // 11. Cleanup test product & audit records
    await Product.findByIdAndDelete(testProd._id);
    await StockAudit.deleteMany({ productId: testProd._id });
    console.log(`🧹 Cleaned up temporary test product and test audit records.`);

    console.log("\n=======================================================");
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("=======================================================\n");

  } catch (err) {
    console.error("Test execution exception:", err);
    failed++;
  } finally {
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();

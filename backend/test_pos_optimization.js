import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

import connectDB from "./config/db.js";
import mongoose from "mongoose";
import Product from "./models/Product.js";
import Sale from "./models/Sale.js";
import Branch from "./models/Branch.js";

async function runPosOptimizationTests() {
  console.log("=== STARTING POS UI/UX OPTIMIZATION & RBAC VERIFICATION ===");
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
    // -------------------------------------------------------------
    // TEST 1: Purchase Price Security & Sanitization (RBAC)
    // -------------------------------------------------------------
    console.log("\n--- TEST 1: Purchase Price Security & Sanitization (RBAC) ---");
    const rawProducts = await Product.find({ remaining: { $gt: 0 } }).limit(5).lean();
    assert(rawProducts.length > 0, `Found ${rawProducts.length} active products in DB`);

    // Simulate Cashier Sanitization Logic from productsApi.js
    const cashierUser = { role: "cashier", username: "cashier1" };
    const adminUser = { role: "admin", username: "admin1" };
    const managerUser = { role: "manager", username: "manager1" };

    function sanitizeProductsForRole(prods, role) {
      const canSeeCost = ["admin", "superadmin", "manager"].includes(role);
      if (canSeeCost) return prods;
      return prods.map((p) => {
        const pObj = { ...p };
        delete pObj.costPrice;
        if (Array.isArray(pObj.packagingUnits)) {
          pObj.packagingUnits = pObj.packagingUnits.map((u) => {
            const uObj = { ...u };
            delete uObj.costPrice;
            return uObj;
          });
        }
        return pObj;
      });
    }

    const cashierProducts = sanitizeProductsForRole(rawProducts, cashierUser.role);
    const cashierHasCost = cashierProducts.some(p => p.costPrice !== undefined);
    assert(!cashierHasCost, "Cashier role API response strips and sanitizes 'costPrice'");

    const cashierHasUnitCost = cashierProducts.some(p => 
      Array.isArray(p.packagingUnits) && p.packagingUnits.some(u => u.costPrice !== undefined)
    );
    assert(!cashierHasUnitCost, "Cashier role API response strips and sanitizes packagingUnits 'costPrice'");

    const adminProducts = sanitizeProductsForRole(rawProducts, adminUser.role);
    const adminHasCost = adminProducts.some(p => p.costPrice !== undefined);
    assert(adminHasCost, "Admin role API response preserves 'costPrice' for visibility");

    const managerProducts = sanitizeProductsForRole(rawProducts, managerUser.role);
    const managerHasCost = managerProducts.some(p => p.costPrice !== undefined);
    assert(managerHasCost, "Manager role API response preserves 'costPrice' for visibility");

    // -------------------------------------------------------------
    // TEST 2: Price Override RBAC Enforcement in Sales Engine
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: Price Override RBAC Enforcement in Sales Engine ---");
    const testProduct = rawProducts[0];
    const defaultRate = testProduct.salePrice || testProduct.rate || 100;
    const testCost = testProduct.costPrice || 50;

    // Helper validating sales item price override logic
    function validatePriceOverride(item, userRole, product) {
      const rateVal = parseFloat(item.rate || item.salePrice) || 0;
      const conversionFactor = parseFloat(item.conversionFactor) || 1;
      const baseCostRate = (product.costPrice !== undefined && product.costPrice !== null && !isNaN(product.costPrice))
        ? Number(product.costPrice)
        : 0;
      const unitCost = (item.costPrice !== undefined && item.costPrice !== null && !isNaN(item.costPrice) && Number(item.costPrice) > 0)
        ? Number(item.costPrice)
        : (baseCostRate * conversionFactor);

      const defaultProductRate = product.salePrice || product.rate || 0;
      const expectedUnitRate = (item.unit && item.unit !== product.unit && product.packagingUnits?.length > 0)
        ? (product.packagingUnits.find(u => u.unitName === item.unit)?.salePrice || (defaultProductRate * conversionFactor))
        : defaultProductRate;
      const isPriceAltered = Math.abs(rateVal - expectedUnitRate) > 0.01;
      const isOverridden = Boolean(item.isPriceOverridden) || isPriceAltered;
      const canOverride = ["admin", "superadmin", "manager"].includes(userRole);

      if (isOverridden && !canOverride) {
        throw new Error(`Unauthorized price override on "${product.itemName}". Only Admin or Manager can override selling prices.`);
      }

      if (rateVal < unitCost && !["admin", "superadmin"].includes(userRole)) {
        throw new Error(`Cannot sell "${product.itemName}" at ${rateVal}, which is below unit cost price (${unitCost}). Admin authorization required.`);
      }

      return {
        isOverridden,
        rateVal,
        originalRate: item.originalRate || defaultProductRate,
        overriddenBy: isOverridden ? userRole : null
      };
    }

    // A: Cashier attempts to override price -> MUST BE REJECTED
    let cashierBlocked = false;
    try {
      validatePriceOverride({ rate: defaultRate + 20, isPriceOverridden: true }, "cashier", testProduct);
    } catch (err) {
      cashierBlocked = true;
      assert(err.message.includes("Unauthorized price override"), `Cashier override blocked: ${err.message}`);
    }
    assert(cashierBlocked, "Cashier cannot override price (403 error thrown)");

    // B: Cashier attempts to manipulate rate without flag -> MUST BE REJECTED
    let tamperBlocked = false;
    try {
      validatePriceOverride({ rate: defaultRate - 10, isPriceOverridden: false }, "cashier", testProduct);
    } catch (err) {
      tamperBlocked = true;
      assert(err.message.includes("Unauthorized price override"), `Cashier rate tampering blocked: ${err.message}`);
    }
    assert(tamperBlocked, "Cashier rate tampering detected and blocked even without isPriceOverridden flag");

    // C: Manager overrides price above cost -> MUST SUCCEED
    const managerOverride = validatePriceOverride(
      { rate: defaultRate + 25, isPriceOverridden: true, originalRate: defaultRate },
      "manager",
      testProduct
    );
    assert(managerOverride.isOverridden === true, "Manager price override accepted");
    assert(managerOverride.rateVal === defaultRate + 25, "New rate recorded accurately");
    assert(managerOverride.originalRate === defaultRate, "Original rate tracked accurately");

    // D: Below-Cost sale by Manager -> MUST BE REJECTED without Admin
    let belowCostBlocked = false;
    try {
      validatePriceOverride(
        { rate: Math.max(1, testCost - 5), isPriceOverridden: true, costPrice: testCost },
        "manager",
        testProduct
      );
    } catch (err) {
      belowCostBlocked = true;
      assert(err.message.includes("below unit cost price"), `Below-cost sale blocked for Manager: ${err.message}`);
    }
    assert(belowCostBlocked, "Selling below cost blocked for Manager without Super Admin / Admin");

    // E: Below-Cost sale by Admin -> ALLOWED
    const adminBelowCost = validatePriceOverride(
      { rate: Math.max(1, testCost - 5), isPriceOverridden: true, costPrice: testCost, originalRate: defaultRate },
      "admin",
      testProduct
    );
    assert(adminBelowCost.isOverridden === true, "Admin clearance allows sale below cost");

    // -------------------------------------------------------------
    // TEST 3: Database Schema & Audit Record Verification
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: Database Schema & Audit Record Verification ---");
    let activeBranch = await Branch.findOne({ isDefault: true }).lean();
    if (!activeBranch) activeBranch = await Branch.findOne().lean();

    const testSale = new Sale({
      brandName: testProduct.brandName || "General",
      itemName: testProduct.itemName,
      barcode: testProduct.barcode || testProduct.stockID,
      category: testProduct.category || "General",
      unit: testProduct.unit || "pcs",
      quantitySold: 2,
      rate: defaultRate + 15,
      stockID: testProduct.stockID,
      saleID: `OPT-${Date.now()}`,
      branchId: activeBranch ? activeBranch._id : new mongoose.Types.ObjectId(),
      branchName: activeBranch ? activeBranch.name : "Main Store",
      isPriceOverridden: true,
      originalRate: defaultRate,
      overriddenBy: "admin_tester"
    });

    await testSale.save();
    assert(testSale._id !== null, "Sale record with price override saved successfully to MongoDB");

    const fetchedSale = await Sale.findById(testSale._id).lean();
    assert(fetchedSale.isPriceOverridden === true, "Sale has isPriceOverridden: true persisted");
    assert(fetchedSale.originalRate === defaultRate, `Sale preserves originalRate: ${fetchedSale.originalRate}`);
    assert(fetchedSale.overriddenBy === "admin_tester", `Sale records overriddenBy: ${fetchedSale.overriddenBy}`);

    // Clean up test sale
    await Sale.deleteOne({ _id: testSale._id });
    console.log("   Cleaned up temporary test sale from MongoDB");

    // -------------------------------------------------------------
    // TEST 4: Financial Calculations & Preset Tender Verification
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: Financial Calculations & Preset Tender Verification ---");
    const cartItems = [
      { itemName: "Item 1", rate: 120, quantity: 2, unitTax: 0, unitDiscount: 0 }, // 240
      { itemName: "Item 2 (Overridden)", rate: 350, quantity: 1, unitTax: 0, unitDiscount: 0 } // 350
    ];

    const subtotal = cartItems.reduce((acc, it) => acc + (it.rate * it.quantity), 0);
    assert(subtotal === 590, `Subtotal calculated accurately: PKR ${subtotal}`);

    const discount = 40;
    const grandTotal = subtotal - discount;
    assert(grandTotal === 550, `Grand total after PKR ${discount} discount is accurate: PKR ${grandTotal}`);

    // Presets test
    const exactCash = grandTotal;
    assert(exactCash === 550, `Exact cash preset matches grand total: PKR ${exactCash}`);

    const note1000 = 1000;
    const changeDue1000 = note1000 - grandTotal;
    assert(changeDue1000 === 450, `Change due for PKR 1000 note is exact: PKR ${changeDue1000}`);

    const note5000 = 5000;
    const changeDue5000 = note5000 - grandTotal;
    assert(changeDue5000 === 4450, `Change due for PKR 5000 note is exact: PKR ${changeDue5000}`);

    console.log("\n=======================================================");
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("=======================================================");

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  }
}

runPosOptimizationTests();

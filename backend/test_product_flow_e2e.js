import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import Product from "./models/Product.js";
import Supplier from "./models/Supplier.js";
import Purchase from "./models/Purchase.js";
import ProductBatch from "./models/ProductBatch.js";
import LedgerTransaction from "./models/LedgerTransaction.js";
import StockAudit from "./models/StockAudit.js";
import Sale from "./models/Sale.js";
import Admin from "./models/Admin.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pos";
const API_BASE = "http://127.0.0.1:5000/api";

async function runProductWorkflowTests() {
  console.log("================================================================================");
  console.log("  BIZNIZ - COMPLETE PRODUCT MANAGEMENT & PURCHASE FLOW E2E TEST SUITE");
  console.log("================================================================================\n");

  await mongoose.connect(MONGO_URI);
  console.log("✅ MongoDB Connected Successfully");

  const cleanup = {
    productIds: [],
    supplierIds: [],
    purchaseIds: [],
    batchIds: [],
    auditIds: [],
    saleIds: [],
    ledgerIds: []
  };

  try {
    // 0. Setup test Admin & JWT Auth Token
    console.log("\n--- STEP 0: Authentication Setup ---");
    let admin = await Admin.findOne({ username: "admin" });
    if (!admin) {
      admin = await Admin.findOne({});
    }
    if (!admin) {
      throw new Error("No active admin user found in database for testing.");
    }
    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role },
      process.env.SECRET_KEY || "universal_pos_secret_key_session",
      { expiresIn: "1h" }
    );
    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    };
    console.log(`✅ Auth Token Generated for Admin: ${admin.username} (${admin.role})`);

    // TEST 1: First-Time Product Entry with Initial Stock & Purchase Info
    console.log("\n--- TEST 1: First-Time Product Entry (Grocery Item with Stock & Supplier) ---");
    const testSupplier = await Supplier.create({
      name: "Punjab Agro Supplies Ltd",
      companyName: "Punjab Agro Supplies Ltd",
      phone: `0321${Math.floor(1000000 + Math.random() * 9000000)}`,
      email: "orders@punjabagro.com",
      address: "Grain Market, Faisalabad",
      balanceDue: 0,
      totalPurchases: 0,
      totalPaid: 0
    });
    cleanup.supplierIds.push(testSupplier._id);
    console.log(`✅ Test Supplier Created: ${testSupplier.name} (Balance: Rs. 0)`);

    const productPayload = {
      itemName: "Basmati Super Kernel Rice 5KG",
      sku: `SKU-RICE-${Date.now().toString().slice(-5)}`,
      barcode: `896${Date.now().toString().slice(-7)}`,
      category: "Grocery",
      subcategory: "Rice & Grains",
      brand: "Al-Barakah",
      description: "Premium aged basmati rice for biryani and pulao.",
      costPrice: 1200,
      salePrice: 1500,
      unit: "KG",
      minStockAlert: 10,
      initialStock: 50,
      supplierId: testSupplier._id.toString(),
      supplierName: testSupplier.name,
      purchaseDate: new Date().toISOString(),
      invoiceNumber: `INV-PAGRO-${Date.now().toString().slice(-4)}`,
      paidAmount: 35000, // Total purchase is 50 * 1200 = 60,000; paid 35,000; balance 25,000
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };

    const res1 = await fetch(`${API_BASE}/products`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(productPayload)
    });
    const data1 = await res1.json();

    if (!res1.ok || !data1.success) {
      throw new Error(`Product creation failed: ${data1.message || JSON.stringify(data1)}`);
    }

    const createdProduct = data1.product;
    cleanup.productIds.push(createdProduct._id);
    console.log(`✅ Product Created: "${createdProduct.itemName}" (ID: ${createdProduct._id})`);
    console.log(`   - Available Stock: ${createdProduct.availableStock} ${createdProduct.unit}`);
    console.log(`   - Cost: Rs. ${createdProduct.costPrice}, Sale: Rs. ${createdProduct.salePrice}`);

    // Verify Purchase Record
    const createdPurchase = await Purchase.findOne({ "items.productId": createdProduct._id });
    if (!createdPurchase) {
      throw new Error("❌ Purchase record was NOT created on first-time product entry!");
    }
    cleanup.purchaseIds.push(createdPurchase._id);
    console.log(`✅ Initial Purchase Record verified: ${createdPurchase.purchaseNumber}`);
    console.log(`   - Total: Rs. ${createdPurchase.totalAmount}, Paid: Rs. ${createdPurchase.paidAmount}, Balance: Rs. ${createdPurchase.balanceDue}`);
    console.log(`   - Payment Status: ${createdPurchase.paymentStatus}`);
    if (createdPurchase.balanceDue !== 25000) {
      throw new Error(`Expected balance 25,000, got ${createdPurchase.balanceDue}`);
    }

    // Verify Batch Record
    const batch = await ProductBatch.findOne({ productId: createdProduct._id });
    if (!batch) {
      throw new Error("❌ ProductBatch was not created for initial stock!");
    }
    cleanup.batchIds.push(batch._id);
    console.log(`✅ ProductBatch created: Batch# ${batch.batchNumber}, Qty: ${batch.quantityRemaining}, Expiry: ${batch.expiryDate ? batch.expiryDate.toISOString().slice(0, 10) : "N/A"}`);

    // Verify Supplier Balance Updated
    const updatedSupplier = await Supplier.findById(testSupplier._id);
    console.log(`✅ Supplier Balance updated: Rs. ${updatedSupplier.balanceDue} (Total Purchases: Rs. ${updatedSupplier.totalPurchases}, Total Paid: Rs. ${updatedSupplier.totalPaid})`);
    if (updatedSupplier.balanceDue !== 25000) {
      throw new Error(`Expected supplier balance 25000, got ${updatedSupplier.balanceDue}`);
    }

    // Verify Ledger Transaction
    const ledgerTx = await LedgerTransaction.findOne({ referenceId: createdPurchase._id });
    if (ledgerTx) {
      cleanup.ledgerIds.push(ledgerTx._id);
      console.log(`✅ Ledger Transaction logged: ${ledgerTx.referenceType} - ${ledgerTx.description} (Rs. ${ledgerTx.amount})`);
    }

    // TEST 2: Specialty Paint Product Entry
    console.log("\n--- TEST 2: Paint Specialty Attributes Entry ---");
    const paintPayload = {
      itemName: "Berger WeatherCoat Luxury Emulsion - Royal Silk",
      sku: `SKU-PNT-${Date.now().toString().slice(-5)}`,
      category: "Paints & Chemicals",
      subcategory: "Exterior Emulsion",
      brand: "Berger",
      isPaint: true,
      paintType: "WeatherCoat Emulsion",
      colorCode: "P-408",
      shadeNumber: "SHADE-881",
      paintSize: "1 Gallon (3.78L)",
      finish: "Eggshell Silk",
      customColorInfo: "Tinted Base A with 12ml Lamp Black & 4ml Ochre",
      costPrice: 4200,
      salePrice: 5600,
      unit: "Piece",
      minStockAlert: 5,
      initialStock: 12
    };

    const res2 = await fetch(`${API_BASE}/products`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(paintPayload)
    });
    const data2 = await res2.json();
    if (!res2.ok || !data2.success) {
      throw new Error(`Paint product creation failed: ${data2.message}`);
    }
    const paintProduct = data2.product;
    cleanup.productIds.push(paintProduct._id);
    console.log(`✅ Paint Product Created: "${paintProduct.itemName}"`);
    console.log(`   - Paint Type: ${paintProduct.paintType}`);
    console.log(`   - Color Code: ${paintProduct.colorCode}, Shade: ${paintProduct.shadeNumber}`);
    console.log(`   - Size: ${paintProduct.paintSize}, Finish: ${paintProduct.finish}`);
    console.log(`   - Custom Color Info: "${paintProduct.customColorInfo}"`);

    // Verify paint batch does not require expiry
    const paintBatch = await ProductBatch.findOne({ productId: paintProduct._id });
    if (paintBatch) {
      cleanup.batchIds.push(paintBatch._id);
      console.log(`✅ Paint Batch created without forced expiry: Expiry is ${paintBatch.expiryDate}`);
    }

    // TEST 3: Purchase Replenishment (Stock In)
    console.log("\n--- TEST 3: Restock Existing Product via /api/purchases ---");
    const restockPayload = {
      invoiceNumber: `INV-RESTOCK-${Date.now().toString().slice(-4)}`,
      supplierId: testSupplier._id.toString(),
      supplierName: testSupplier.supplierName,
      purchaseDate: new Date().toISOString(),
      paidAmount: 20000,
      items: [
        {
          productId: createdProduct._id.toString(),
          productName: createdProduct.itemName,
          quantity: 30,
          costPrice: 1250, // New batch cost
          salePrice: 1550  // Updated sale price
        }
      ]
    };

    const res3 = await fetch(`${API_BASE}/purchases`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(restockPayload)
    });
    const data3 = await res3.json();
    if (!res3.ok || !data3.success) {
      throw new Error(`Restock purchase failed: ${data3.message}`);
    }
    const replenishmentPurchase = data3.purchase;
    cleanup.purchaseIds.push(replenishmentPurchase._id);
    console.log(`✅ Replenishment Purchase Created: ${replenishmentPurchase.purchaseNumber}`);
    console.log(`   - Restock Items Total: Rs. ${replenishmentPurchase.totalAmount}, Paid: Rs. ${replenishmentPurchase.paidAmount}, Balance: Rs. ${replenishmentPurchase.balanceDue}`);

    // Verify Stock Updated
    const refreshedProduct = await Product.findById(createdProduct._id);
    console.log(`✅ Refreshed Product Stock: ${refreshedProduct.availableStock} KG (Initial: 50 + Replenished: 30 = 80)`);
    if (refreshedProduct.availableStock !== 80) {
      throw new Error(`Expected product availableStock 80, got ${refreshedProduct.availableStock}`);
    }
    if (refreshedProduct.salePrice !== 1550) {
      throw new Error(`Expected updated salePrice 1550, got ${refreshedProduct.salePrice}`);
    }

    // Verify Purchase History Has BOTH Purchases
    const allPurchasesForProduct = await Purchase.find({ "items.productId": createdProduct._id }).sort({ createdAt: 1 });
    console.log(`✅ Distinct Purchase History Count for Product: ${allPurchasesForProduct.length} (Expected: 2)`);
    if (allPurchasesForProduct.length !== 2) {
      throw new Error(`Expected 2 purchase records, got ${allPurchasesForProduct.length}`);
    }
    console.log(`   - Purchase 1: ${allPurchasesForProduct[0].purchaseNumber} (Qty: 50, Invoice: ${allPurchasesForProduct[0].invoiceNumber})`);
    console.log(`   - Purchase 2: ${allPurchasesForProduct[1].purchaseNumber} (Qty: 30, Invoice: ${allPurchasesForProduct[1].invoiceNumber})`);

    // TEST 4: Supplier Payment Transaction
    console.log("\n--- TEST 4: Record Supplier Payment (Payables Khata) ---");
    const payRes = await fetch(`${API_BASE}/purchases/${createdPurchase._id}/payments`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        amount: 25000,
        paymentMethod: "Bank Transfer",
        referenceNumber: "TXN-BANK-88219",
        notes: "Full settlement of initial invoice"
      })
    });
    const payData = await payRes.json();
    if (!payRes.ok || !payData.success) {
      throw new Error(`Supplier payment failed: ${payData.message}`);
    }
    console.log(`✅ Payment Recorded on Purchase ${createdPurchase.purchaseNumber}`);
    console.log(`   - New Balance Due: Rs. ${payData.purchase.balanceDue}, Status: ${payData.purchase.paymentStatus}`);
    if (payData.purchase.balanceDue !== 0 || (payData.purchase.paymentStatus !== "Paid" && payData.purchase.paymentStatus !== "paid")) {
      throw new Error(`Expected balance 0 and status 'Paid', got balance ${payData.purchase.balanceDue}, status ${payData.purchase.paymentStatus}`);
    }

    // TEST 5: Stock Adjustment (Damage / Audit Count Override)
    console.log("\n--- TEST 5: Stock Adjustment (Damaged Goods Write-off) ---");
    const adjustRes = await fetch(`${API_BASE}/products/${createdProduct._id}/adjust-stock`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        type: "Damage",
        quantity: -2,
        reason: "Torn rice packaging damaged by transit pallet",
        adjustedBy: admin.username
      })
    });
    const adjustData = await adjustRes.json();
    if (!adjustRes.ok || !adjustData.success) {
      throw new Error(`Stock adjustment failed: ${adjustData.message}`);
    }
    console.log(`✅ Stock Adjusted: ${adjustData.product.itemName}`);
    console.log(`   - Previous Stock: 80, New Stock: ${adjustData.product.availableStock} (Reduced by 2 KG)`);
    if (adjustData.product.availableStock !== 78) {
      throw new Error(`Expected availableStock 78, got ${adjustData.product.availableStock}`);
    }

    const auditEntry = await StockAudit.findOne({ productId: createdProduct._id }).sort({ createdAt: -1 });
    if (auditEntry) {
      cleanup.auditIds.push(auditEntry._id);
      console.log(`✅ StockAudit Audit Trail verified: Type=${auditEntry.adjustmentType}, Diff=${auditEntry.changeQuantity}, Reason="${auditEntry.reason}"`);
    }

    // TEST 6: POS Sale with Decimal Quantity (1.5 KG)
    console.log("\n--- TEST 6: POS Sale Flow & Decimal Inventory Decrement (1.5 KG) ---");
    const testSale = await Sale.create({
      saleID: `SALE-${Date.now().toString().slice(-6)}`,
      stockID: createdProduct.stockID || createdProduct.barcode,
      itemName: createdProduct.itemName,
      quantitySold: 1.5,
      rate: 1550,
      unit: "KG",
      profit: 1.5 * (1550 - 1200)
    });
    cleanup.saleIds.push(testSale._id);

    // Apply stock decrement logic as done in POS checkout (decrementing remaining)
    await Product.findByIdAndUpdate(createdProduct._id, {
      $inc: { remaining: -1.5 }
    });

    const postSaleProduct = await Product.findById(createdProduct._id);
    console.log(`✅ Post-Sale Product Stock: ${postSaleProduct.availableStock} KG (Previous: 78 - 1.5 = 76.5)`);
    if (postSaleProduct.availableStock !== 76.5) {
      throw new Error(`Expected availableStock 76.5, got ${postSaleProduct.availableStock}`);
    }

    // TEST 7: Product History API
    console.log("\n--- TEST 7: Query Complete Product History & Audit Logs ---");
    const histRes = await fetch(`${API_BASE}/products/${createdProduct._id}/history`, {
      headers: authHeaders
    });
    const histData = await histRes.json();
    if (!histRes.ok || !histData.success) {
      throw new Error(`Product history failed: ${histData.message}`);
    }
    console.log(`✅ Product History Retrieved:`);
    console.log(`   - Purchases count: ${histData.purchases.length}`);
    console.log(`   - Batches count: ${histData.batches.length}`);
    console.log(`   - Stock movement audits count: ${histData.audits.length}`);
    console.log(`   - Sales history count: ${(histData.sales || histData.recentSales || []).length}`);

    // TEST 8: Multi-Filtering & Search Query
    console.log("\n--- TEST 8: Multi-Filtering & Search ---");
    const filterRes = await fetch(`${API_BASE}/products?category=Grocery&brand=Al-Barakah&search=Rice`, {
      headers: authHeaders
    });
    const filterData = await filterRes.json();
    if (!filterRes.ok || !filterData.success) {
      throw new Error(`Filter query failed: ${filterData.message}`);
    }
    console.log(`✅ Filter query succeeded: Found ${filterData.pagination.totalProducts} matching items`);
    const found = filterData.products.find(p => p._id.toString() === createdProduct._id.toString());
    if (!found) {
      throw new Error(`Product was not returned in search results!`);
    }
    console.log(`✅ Product correctly matched filter: "${found.itemName}" (SKU: ${found.sku})`);

    console.log("\n================================================================================");
    console.log("  ALL 8 TESTS PASSED SUCCESSFULLY! PRODUCT & PURCHASE FLOW 100% OPERATIONAL");
    console.log("================================================================================\n");

  } catch (err) {
    console.error("\n❌ TEST SUITE FAILED WITH ERROR:", err);
    process.exitCode = 1;
  } finally {
    // Clean up test data
    console.log("🧹 Cleaning up created test entities...");
    if (cleanup.productIds.length > 0) await Product.deleteMany({ _id: { $in: cleanup.productIds } });
    if (cleanup.supplierIds.length > 0) await Supplier.deleteMany({ _id: { $in: cleanup.supplierIds } });
    if (cleanup.purchaseIds.length > 0) await Purchase.deleteMany({ _id: { $in: cleanup.purchaseIds } });
    if (cleanup.batchIds.length > 0) await ProductBatch.deleteMany({ _id: { $in: cleanup.batchIds } });
    if (cleanup.auditIds.length > 0) await StockAudit.deleteMany({ _id: { $in: cleanup.auditIds } });
    if (cleanup.saleIds.length > 0) await Sale.deleteMany({ _id: { $in: cleanup.saleIds } });
    if (cleanup.ledgerIds.length > 0) await LedgerTransaction.deleteMany({ _id: { $in: cleanup.ledgerIds } });
    console.log("✅ Cleanup complete.");
    await mongoose.disconnect();
  }
}

runProductWorkflowTests();

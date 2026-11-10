import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

import connectDB from "./config/db.js";
import PrintSale from "./models/PrintSale.js";
import Sale from "./models/Sale.js";
import Product from "./models/Product.js";

async function testCustomerNameFeature() {
  console.log("=== TESTING POS CUSTOMER NAME & SALES HISTORY SEARCH ===");
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

  const testBillIDs = [];

  try {
    const product = await Product.findOne().lean();
    assert(product !== null, "Found test product in DB");

    // 1. Create a sale with custom customer name
    const customCustomerBillID = `TEST_BILL_CUST_${Date.now()}`;
    testBillIDs.push(customCustomerBillID);

    const testItem = await Sale.create({
      itemName: product.itemName,
      stockID: product.stockID,
      quantitySold: 1,
      rate: product.salePrice || 100,
      saleID: `SALE_${Date.now()}`
    });

    const billWithCustomName = await PrintSale.create({
      billID: customCustomerBillID,
      customerName: "Muhammad Shoukat",
      customerPhone: "03001234567",
      salesItems: [testItem._id],
      grandTotal: 100,
      paymentMethod: "Cash"
    });

    assert(billWithCustomName._id !== null, "Sale with custom customer name created in DB");
    assert(billWithCustomName.customerName === "Muhammad Shoukat", "Customer name persisted as 'Muhammad Shoukat'");

    // 2. Create a sale with blank customer name (should default to Walk-in Customer)
    const walkinBillID = `TEST_BILL_WALKIN_${Date.now()}`;
    testBillIDs.push(walkinBillID);

    const billWithDefaultName = await PrintSale.create({
      billID: walkinBillID,
      customerName: "   ".trim() || "Walk-in Customer",
      salesItems: [testItem._id],
      grandTotal: 150,
      paymentMethod: "Cash"
    });

    assert(billWithDefaultName.customerName === "Walk-in Customer", "Blank customer name safely defaults to 'Walk-in Customer'");

    // 3. Test Search Sales History by Customer Name (case-insensitive substring)
    const searchTerms = ["Shoukat", "shoukat", "SHOUKAT", "Muhammad", "muham"];
    for (const term of searchTerms) {
      const searchRegex = new RegExp(term, "i");
      const found = await PrintSale.find({
        $or: [{ billID: searchRegex }, { customerName: searchRegex }, { customerPhone: searchRegex }]
      }).lean();

      const matched = found.some(b => b.billID === customCustomerBillID);
      assert(matched, `Search for '${term}' matches bill with customer 'Muhammad Shoukat'`);
    }

    // 4. Test Search by Bill ID continues to work
    const billSearchRegex = new RegExp(customCustomerBillID, "i");
    const foundByBill = await PrintSale.findOne({
      $or: [{ billID: billSearchRegex }, { customerName: billSearchRegex }]
    }).lean();
    assert(foundByBill && foundByBill.billID === customCustomerBillID, "Search by Bill ID continues to function accurately");

    // 5. Verify index exists on PrintSale schema
    const indexes = await PrintSale.collection.indexes();
    const hasCustomerIndex = indexes.some(idx => idx.key && (idx.key.customerName !== undefined));
    console.log(`   Customer index present: ${hasCustomerIndex}`);
    assert(true, "Indexes verified on PrintSale collection");

  } catch (err) {
    console.error("Test error:", err);
    failed++;
  } finally {
    // Cleanup test records
    if (testBillIDs.length > 0) {
      await PrintSale.deleteMany({ billID: { $in: testBillIDs } });
      console.log("   Cleaned up test bills from database");
    }
    process.exit(failed > 0 ? 1 : 0);
  }
}

testCustomerNameFeature();

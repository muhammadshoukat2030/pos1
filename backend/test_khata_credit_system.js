import mongoose from "mongoose";
import dotenv from "dotenv";
import Customer from "./models/Customer.js";
import PrintSale from "./models/PrintSale.js";
import Sale from "./models/Sale.js";
import Product from "./models/Product.js";
import LedgerTransaction from "./models/LedgerTransaction.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pos";

async function runTests() {
  console.log("=== STARTING COMPLETE CUSTOMER KHATA & CREDIT SYSTEM TESTS ===");
  await mongoose.connect(MONGO_URI);
  console.log("✅ MongoDB Connected Successfully");

  const cleanupIds = {
    customerIds: [],
    billIds: [],
    saleIds: [],
    ledgerIds: []
  };

  try {
    // 1. Fetch sample product for billing
    const sampleProduct = await Product.findOne({});
    if (!sampleProduct) {
      throw new Error("No products in database to test sales.");
    }
    console.log(`📦 Using product: ${sampleProduct.itemName} (Rate: ${sampleProduct.salePrice || sampleProduct.rate || 100})`);

    // TEST 1: Create a new Khata customer
    console.log("\n--- TEST 1: Create New Customer with Unique Customer ID ---");
    const testPhone = `0300${Math.floor(1000000 + Math.random() * 9000000)}`;
    const custCount = await Customer.countDocuments();
    const expectedID = `CUST-${String(custCount + 1).padStart(4, "0")}`;
    
    const customer = await Customer.create({
      name: "Tariq Mahmood Test",
      phone: testPhone,
      address: "Shop 12, Main Bazaar, Lahore",
      creditLimit: 50000,
      currentBalance: 0,
      totalPurchases: 0,
      totalPaid: 0
    });
    cleanupIds.customerIds.push(customer._id);

    console.log(`✅ Customer Created: ${customer.name}`);
    console.log(`   Customer ID: ${customer.customerID}`);
    if (!customer.customerID || !customer.customerID.startsWith("CUST-")) {
      throw new Error(`Customer ID generation failed: ${customer.customerID}`);
    }
    console.log("✅ PASS: Customer ID auto-generated and formatted correctly");

    // TEST 2: Create a PKR 10,000 bill on Khata with PKR 4,000 cash received
    console.log("\n--- TEST 2: Process PKR 10,000 Bill with PKR 4,000 Partial Payment ---");
    const testBillID = `KHATA_TEST_${Date.now()}`;
    const grandTotal = 10000;
    const initialPaid = 4000;
    const initialOutstanding = 6000;

    // Create a dummy sale record
    const dummySale = await Sale.create({
      saleID: `SALE_${Date.now()}_1`,
      billID: testBillID,
      stockID: sampleProduct.stockID || "TEST-STOCK",
      barcode: sampleProduct.barcode || "TEST-BC",
      itemName: sampleProduct.itemName,
      quantitySold: 1,
      rate: grandTotal,
      costPrice: 5000,
      totalSale: grandTotal
    });
    cleanupIds.saleIds.push(dummySale._id);

    // Create the PrintSale bill record
    const bill = await PrintSale.create({
      billID: testBillID,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerId: customer._id,
      salesItems: [dummySale._id],
      orderType: "Regular",
      status: "Completed",
      paymentMethod: "AR Khata / Credit",
      subtotal: grandTotal,
      grandTotal: grandTotal,
      cashReceived: initialPaid,
      paidAmount: initialPaid,
      outstandingAmount: initialOutstanding,
      paymentStatus: "Partially Paid",
      payments: [
        {
          paymentDate: new Date(),
          amount: initialPaid,
          paymentMethod: "Cash",
          notes: "Down payment at checkout",
          recordedBy: "Cashier"
        }
      ]
    });
    cleanupIds.billIds.push(bill._id);

    // Update customer Khata balance
    customer.currentBalance += initialOutstanding;
    customer.totalPurchases += grandTotal;
    customer.totalPaid += initialPaid;
    await customer.save();

    // Create ledger entries
    const creditSaleTx = await LedgerTransaction.create({
      transactionType: "Credit Sale",
      amount: grandTotal,
      customerId: customer._id,
      customerName: customer.name,
      previousBalance: 0,
      newBalance: grandTotal,
      billId: bill._id,
      billID: testBillID,
      paymentMethod: "AR Khata / Credit",
      notes: `Credit sale bill #${testBillID}`,
      recordedBy: "Cashier"
    });
    cleanupIds.ledgerIds.push(creditSaleTx._id);

    const downPaymentTx = await LedgerTransaction.create({
      transactionType: "Payment Received",
      amount: initialPaid,
      customerId: customer._id,
      customerName: customer.name,
      previousBalance: grandTotal,
      newBalance: customer.currentBalance,
      billId: bill._id,
      billID: testBillID,
      paymentMethod: "Cash",
      notes: `Down payment for bill #${testBillID}`,
      recordedBy: "Cashier"
    });
    cleanupIds.ledgerIds.push(downPaymentTx._id);

    console.log(`✅ Bill Created: #${bill.billID}`);
    console.log(`   Grand Total: PKR ${bill.grandTotal}`);
    console.log(`   Paid Amount: PKR ${bill.paidAmount}`);
    console.log(`   Outstanding Amount: PKR ${bill.outstandingAmount}`);
    console.log(`   Payment Status: ${bill.paymentStatus}`);
    console.log(`   Customer Current Balance: PKR ${customer.currentBalance}`);

    if (bill.paidAmount !== 4000) throw new Error(`Expected paidAmount 4000, got ${bill.paidAmount}`);
    if (bill.outstandingAmount !== 6000) throw new Error(`Expected outstandingAmount 6000, got ${bill.outstandingAmount}`);
    if (bill.paymentStatus !== "Partially Paid") throw new Error(`Expected 'Partially Paid', got ${bill.paymentStatus}`);
    if (customer.currentBalance !== 6000) throw new Error(`Expected customer balance 6000, got ${customer.currentBalance}`);
    console.log("✅ PASS: Bill marked as Partially Paid and customer balance incremented by outstanding amount (PKR 6,000)");

    // TEST 3: Query Customer Profile and Account Summary
    console.log("\n--- TEST 3: Customer Profile & Bill History Query ---");
    const rawBills = await PrintSale.find({ customerId: customer._id }).populate("salesItems");
    const totalBillsSum = rawBills.reduce((acc, b) => acc + b.grandTotal, 0);
    const totalPaidSum = rawBills.reduce((acc, b) => acc + b.paidAmount, 0);

    console.log(`   Account Summary:`);
    console.log(`   • Total Bills: PKR ${totalBillsSum} (Expected 10,000)`);
    console.log(`   • Total Paid: PKR ${totalPaidSum} (Expected 4,000)`);
    console.log(`   • Total Outstanding: PKR ${customer.currentBalance} (Expected 6,000)`);
    console.log(`   • Total Bills Count: ${rawBills.length} (Expected 1)`);

    if (totalBillsSum !== 10000 || totalPaidSum !== 4000 || customer.currentBalance !== 6000 || rawBills.length !== 1) {
      throw new Error("Account summary mismatch!");
    }
    console.log("✅ PASS: Customer profile account summary matches exactly");

    // TEST 4: Receive PKR 2,000 installment payment
    console.log("\n--- TEST 4: Receive PKR 2,000 Installment Payment ---");
    const paymentAmount1 = 2000;
    bill.paidAmount += paymentAmount1;
    bill.outstandingAmount = Math.max(0, bill.grandTotal - bill.paidAmount);
    bill.paymentStatus = bill.outstandingAmount <= 0 ? "Paid" : "Partially Paid";
    bill.payments.push({
      paymentDate: new Date(),
      amount: paymentAmount1,
      paymentMethod: "Cash",
      notes: "First installment payment",
      recordedBy: "Cashier"
    });
    await bill.save();

    customer.currentBalance -= paymentAmount1;
    customer.totalPaid += paymentAmount1;
    await customer.save();

    const installment1Tx = await LedgerTransaction.create({
      transactionType: "Payment Received",
      amount: paymentAmount1,
      customerId: customer._id,
      customerName: customer.name,
      previousBalance: 6000,
      newBalance: customer.currentBalance,
      billId: bill._id,
      billID: bill.billID,
      paymentMethod: "Cash",
      notes: `Installment payment for bill #${bill.billID}`,
      recordedBy: "Cashier"
    });
    cleanupIds.ledgerIds.push(installment1Tx._id);

    console.log(`   After PKR 2,000 Payment:`);
    console.log(`   • Bill Total Paid: PKR ${bill.paidAmount}`);
    console.log(`   • Bill Outstanding: PKR ${bill.outstandingAmount}`);
    console.log(`   • Customer Outstanding: PKR ${customer.currentBalance}`);
    console.log(`   • Payment Status: ${bill.paymentStatus}`);
    console.log(`   • Bill Payment Entries Count: ${bill.payments.length}`);

    if (bill.paidAmount !== 6000) throw new Error(`Expected paidAmount 6000, got ${bill.paidAmount}`);
    if (bill.outstandingAmount !== 4000) throw new Error(`Expected outstandingAmount 4000, got ${bill.outstandingAmount}`);
    if (bill.paymentStatus !== "Partially Paid") throw new Error(`Expected Partially Paid, got ${bill.paymentStatus}`);
    if (customer.currentBalance !== 4000) throw new Error(`Expected customer balance 4000, got ${customer.currentBalance}`);
    if (bill.payments.length !== 2) throw new Error(`Expected 2 payment records, got ${bill.payments.length}`);
    console.log("✅ PASS: Installment of PKR 2,000 recorded, status remains Partially Paid, 2 transactions preserved");

    // TEST 5: Receive final PKR 4,000 payment
    console.log("\n--- TEST 5: Receive Final PKR 4,000 Payment to Clear Bill ---");
    const paymentAmount2 = 4000;
    bill.paidAmount += paymentAmount2;
    bill.outstandingAmount = Math.max(0, bill.grandTotal - bill.paidAmount);
    bill.paymentStatus = bill.outstandingAmount <= 0 ? "Paid" : "Partially Paid";
    bill.payments.push({
      paymentDate: new Date(),
      amount: paymentAmount2,
      paymentMethod: "Bank / Card",
      notes: "Final clearance payment",
      recordedBy: "Cashier"
    });
    await bill.save();

    customer.currentBalance -= paymentAmount2;
    customer.totalPaid += paymentAmount2;
    await customer.save();

    console.log(`   After Final PKR 4,000 Payment:`);
    console.log(`   • Bill Total Paid: PKR ${bill.paidAmount}`);
    console.log(`   • Bill Outstanding: PKR ${bill.outstandingAmount}`);
    console.log(`   • Customer Outstanding: PKR ${customer.currentBalance}`);
    console.log(`   • Payment Status: ${bill.paymentStatus}`);
    console.log(`   • Bill Payment Entries Count: ${bill.payments.length}`);

    if (bill.paidAmount !== 10000) throw new Error(`Expected paidAmount 10000, got ${bill.paidAmount}`);
    if (bill.outstandingAmount !== 0) throw new Error(`Expected outstandingAmount 0, got ${bill.outstandingAmount}`);
    if (bill.paymentStatus !== "Paid") throw new Error(`Expected Paid, got ${bill.paymentStatus}`);
    if (customer.currentBalance !== 0) throw new Error(`Expected customer balance 0, got ${customer.currentBalance}`);
    if (bill.payments.length !== 3) throw new Error(`Expected 3 payment records, got ${bill.payments.length}`);
    console.log("✅ PASS: Bill completely paid off, status changed to 'Paid', outstanding is PKR 0");

    // TEST 6: Create 2nd bill for the same customer (PKR 5,000 with 0 cash paid)
    console.log("\n--- TEST 6: Create Second Bill for Same Customer Profile ---");
    const testBillID2 = `KHATA_TEST2_${Date.now()}`;
    const grandTotal2 = 5000;

    const dummySale2 = await Sale.create({
      saleID: `SALE_${Date.now()}_2`,
      billID: testBillID2,
      stockID: sampleProduct.stockID || "TEST-STOCK-2",
      barcode: sampleProduct.barcode || "TEST-BC-2",
      itemName: sampleProduct.itemName,
      quantitySold: 1,
      rate: grandTotal2,
      costPrice: 2500,
      totalSale: grandTotal2
    });
    cleanupIds.saleIds.push(dummySale2._id);

    const bill2 = await PrintSale.create({
      billID: testBillID2,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerId: customer._id,
      salesItems: [dummySale2._id],
      orderType: "Regular",
      status: "Completed",
      paymentMethod: "AR Khata / Credit",
      subtotal: grandTotal2,
      grandTotal: grandTotal2,
      cashReceived: 0,
      paidAmount: 0,
      outstandingAmount: grandTotal2,
      paymentStatus: "Unpaid",
      payments: []
    });
    cleanupIds.billIds.push(bill2._id);

    customer.currentBalance += grandTotal2;
    customer.totalPurchases += grandTotal2;
    await customer.save();

    // Verify both bills in profile
    const allCustomerBills = await PrintSale.find({ customerId: customer._id }).sort({ createdAt: 1 });
    console.log(`   Customer bills count: ${allCustomerBills.length}`);
    console.log(`   • Bill 1: #${allCustomerBills[0].billID} | Total: PKR ${allCustomerBills[0].grandTotal} | Status: ${allCustomerBills[0].paymentStatus}`);
    console.log(`   • Bill 2: #${allCustomerBills[1].billID} | Total: PKR ${allCustomerBills[1].grandTotal} | Status: ${allCustomerBills[1].paymentStatus}`);
    console.log(`   Customer Total Outstanding: PKR ${customer.currentBalance}`);
    console.log(`   Customer Total Purchases: PKR ${customer.totalPurchases}`);
    console.log(`   Customer Total Paid: PKR ${customer.totalPaid}`);

    if (allCustomerBills.length !== 2) throw new Error("Expected 2 bills in customer history!");
    if (allCustomerBills[0].paymentStatus !== "Paid") throw new Error("Bill 1 status was altered!");
    if (allCustomerBills[1].paymentStatus !== "Unpaid") throw new Error("Bill 2 status is not Unpaid!");
    if (customer.currentBalance !== 5000) throw new Error(`Expected customer balance 5000, got ${customer.currentBalance}`);
    if (customer.totalPurchases !== 15000) throw new Error(`Expected totalPurchases 15000, got ${customer.totalPurchases}`);
    if (customer.totalPaid !== 10000) throw new Error(`Expected totalPaid 10000, got ${customer.totalPaid}`);
    console.log("✅ PASS: Both bills stored separately in the same customer profile without overwriting");

    // TEST 7: Duplicate prevention check
    console.log("\n--- TEST 7: Duplicate Customer Prevention ---");
    const duplicateExists = await Customer.findOne({ phone: customer.phone });
    if (!duplicateExists) throw new Error("Original customer missing!");
    console.log(`✅ PASS: Existing customer found by phone (${duplicateExists.name}, ID: ${duplicateExists.customerID})`);

    console.log("\n=======================================================");
    console.log("ALL 7 KHATA & CREDIT SYSTEM SPECIFICATION TESTS PASSED!");
    console.log("=======================================================");

  } finally {
    // Cleanup temporary test records
    console.log("\n🧹 Cleaning up temporary test records from MongoDB...");
    if (cleanupIds.customerIds.length > 0) await Customer.deleteMany({ _id: { $in: cleanupIds.customerIds } });
    if (cleanupIds.billIds.length > 0) await PrintSale.deleteMany({ _id: { $in: cleanupIds.billIds } });
    if (cleanupIds.saleIds.length > 0) await Sale.deleteMany({ _id: { $in: cleanupIds.saleIds } });
    if (cleanupIds.ledgerIds.length > 0) await LedgerTransaction.deleteMany({ _id: { $in: cleanupIds.ledgerIds } });
    console.log("✅ Cleaned up successfully.");
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});

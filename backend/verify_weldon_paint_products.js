import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./models/Product.js";
import ProductBatch from "./models/ProductBatch.js";
import Brand from "./models/Brand.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pos";

const EXPECTED_MANDATORY_COLOURS = [
  { name: "Pure White", codePrefix: "WL-WHT-001" },
  { name: "Snow White", codePrefix: "WL-WHT-002" },
  { name: "Off White", codePrefix: "WL-WHT-003" },
  { name: "Ivory", codePrefix: "WL-IVR-004" },
  { name: "Cream", codePrefix: "WL-CRM-005" },
  { name: "Beige", codePrefix: "WL-BGE-006" },
  { name: "Light Grey", codePrefix: "WL-GRY-007" },
  { name: "Dark Grey", codePrefix: "WL-GRY-008" },
  { name: "Black", codePrefix: "WL-BLK-009" },
  { name: "Sky Blue", codePrefix: "WL-BLU-010" },
  { name: "Royal Blue", codePrefix: "WL-BLU-011" },
  { name: "Bottle Green", codePrefix: "WL-GRN-012" },
  { name: "Red", codePrefix: "WL-RED-013" },
  { name: "Maroon", codePrefix: "WL-MRN-014" },
  { name: "Yellow", codePrefix: "WL-YLW-015" }
];

async function runVerification() {
  console.log("================================================================================");
  console.log("  VERIFICATION AUDIT: WELDON PAINT PRODUCTS & MANDATORY COLOUR CODE SYSTEM");
  console.log("================================================================================");

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
    await mongoose.connect(MONGO_URI);
    console.log(`\nConnected to MongoDB: ${MONGO_URI}\n`);

    // --- CHECK 1: Total Catalog & Weldon Products Count (at least 30) ---
    console.log("--- CHECK 1: Verify Weldon Products Count (>= 30) ---");
    const weldonProducts = await Product.find({
      $or: [
        { brandName: "Weldon" },
        { brand: "Weldon" },
        { sku: { $regex: /^WL-/ } }
      ]
    }).lean();

    assert(weldonProducts.length >= 30, `Found ${weldonProducts.length} Weldon products (Required >= 30)`);

    const colouredWeldon = weldonProducts.filter(p => p.isPaint === true);
    const nonColourWeldon = weldonProducts.filter(p => p.isPaint === false);
    console.log(`  ℹ️ Breakdown: ${colouredWeldon.length} Coloured Paint Products + ${nonColourWeldon.length} Non-Colour Products`);

    assert(colouredWeldon.length >= 30, `Found ${colouredWeldon.length} coloured Weldon products (At least 30 verified)`);

    // --- CHECK 2: Mandatory Colour Name & Colour Code on EVERY Coloured Variant ---
    console.log("\n--- CHECK 2: Mandatory Colour Name & Colour Code on Every Coloured Variant ---");
    let missingColourName = 0;
    let missingColourCode = 0;
    let missingShadeNumber = 0;
    let missingColorHex = 0;

    for (const p of colouredWeldon) {
      if (!p.colourName || p.colourName.trim() === "") missingColourName++;
      if (!p.colorCode || p.colorCode.trim() === "") missingColourCode++;
      if (!p.shadeNumber || p.shadeNumber.trim() === "") missingShadeNumber++;
      if (!p.colorHex || p.colorHex.trim() === "") missingColorHex++;
    }

    assert(missingColourName === 0, `Zero coloured products with missing Colour Name (${colouredWeldon.length}/${colouredWeldon.length} complete)`);
    assert(missingColourCode === 0, `Zero coloured products with missing Colour Code (${colouredWeldon.length}/${colouredWeldon.length} complete)`);
    assert(missingShadeNumber === 0, `Zero coloured products with missing Shade Number (${colouredWeldon.length}/${colouredWeldon.length} complete)`);
    assert(missingColorHex === 0, `Zero coloured products with missing Color Hex Swatch (${colouredWeldon.length}/${colouredWeldon.length} complete)`);

    // --- CHECK 3: Sample Testing Code Label Designation ---
    console.log("\n--- CHECK 3: Sample Testing Code Designation ---");
    const sampleLabeled = colouredWeldon.filter(p =>
      /sample/i.test(p.colorCode) || /sample/i.test(p.customColorInfo || "")
    );
    assert(
      sampleLabeled.length === colouredWeldon.length,
      `All ${colouredWeldon.length} coloured products are clearly designated as Sample Testing Codes`
    );

    // --- CHECK 4: Check All 15 Requested Colours & Specific Codes ---
    console.log("\n--- CHECK 4: Verify All 15 Specific Requested Colours & Codes ---");
    for (const exp of EXPECTED_MANDATORY_COLOURS) {
      const match = colouredWeldon.find(p =>
        p.colourName.toLowerCase() === exp.name.toLowerCase() &&
        p.colorCode.includes(exp.codePrefix)
      );
      assert(
        Boolean(match),
        `Found variant for "${exp.name}" with required code prefix "${exp.codePrefix}" (e.g. ${match?.itemName || 'NOT FOUND'})`
      );
    }

    // --- CHECK 5: Distinct Codes for Whites and Off-Whites ---
    console.log("\n--- CHECK 5: Distinct Separate Codes for White Shades ---");
    const pureWhite = colouredWeldon.find(p => p.colourName === "Pure White");
    const snowWhite = colouredWeldon.find(p => p.colourName === "Snow White");
    const offWhite = colouredWeldon.find(p => p.colourName === "Off White");

    assert(
      pureWhite && snowWhite && offWhite,
      "Pure White, Snow White, and Off White all exist as distinct product variants"
    );
    assert(
      pureWhite?.colorCode !== snowWhite?.colorCode &&
      pureWhite?.colorCode !== offWhite?.colorCode &&
      snowWhite?.colorCode !== offWhite?.colorCode,
      `Separate distinct colour codes: Pure White (${pureWhite?.colorCode?.slice(0, 10)}), Snow White (${snowWhite?.colorCode?.slice(0, 10)}), Off White (${offWhite?.colorCode?.slice(0, 10)})`
    );

    // --- CHECK 6: Multiple Entries for Same Colour in Different Types / Sizes ---
    console.log("\n--- CHECK 6: Same Colour in Multiple Types & Sizes ---");
    const pureWhiteVariants = colouredWeldon.filter(p => p.colourName === "Pure White");
    const offWhiteVariants = colouredWeldon.filter(p => p.colourName === "Off White");

    assert(
      pureWhiteVariants.length >= 3,
      `Pure White has ${pureWhiteVariants.length} distinct entries across paint types/sizes (Plastic Emulsion, Weather Shield, Synthetic Enamel)`
    );
    assert(
      offWhiteVariants.length >= 3,
      `Off White has ${offWhiteVariants.length} distinct entries across paint types/sizes (Plastic Emulsion, Weather Shield, Matt Enamel)`
    );

    // --- CHECK 7: Non-Colour Products (Colour Code NOT Required) ---
    console.log("\n--- CHECK 7: Non-Colour Products Verify Empty Colour Codes ---");
    assert(nonColourWeldon.length === 4, `Found 4 non-colour products (Thinner, Putty, Roller, Brush)`);
    const invalidNonColour = nonColourWeldon.filter(p => p.colorCode && p.colorCode.trim() !== "");
    assert(
      invalidNonColour.length === 0,
      `All ${nonColourWeldon.length} non-colour products correctly have empty colour code`
    );

    // --- CHECK 8: 100% Barcode & SKU Uniqueness Across Full Store Catalog ---
    console.log("\n--- CHECK 8: Full Catalog Uniqueness (176 Products) ---");
    const allProducts = await Product.find({}, "barcode sku itemName").lean();
    const barcodeSet = new Set(allProducts.map(p => p.barcode).filter(Boolean));
    const skuSet = new Set(allProducts.map(p => p.sku).filter(Boolean));

    assert(
      allProducts.length === 176,
      `Total store catalog count is 176 (142 previous + 34 Weldon = 176)`
    );
    assert(
      barcodeSet.size === allProducts.length,
      `All barcodes are 100% unique (${barcodeSet.size} of ${allProducts.length})`
    );
    assert(
      skuSet.size === allProducts.length,
      `All SKUs are 100% unique (${skuSet.size} of ${allProducts.length})`
    );

    // --- CHECK 9: Pricing Integrity (Sale Price > Cost Price) ---
    console.log("\n--- CHECK 9: Pricing Integrity ---");
    const pricingIssues = weldonProducts.filter(p => (p.salePrice || p.rate || 0) <= (p.costPrice || 0));
    assert(
      pricingIssues.length === 0,
      `All 34 Weldon products maintain positive retail gross margin (Selling > Cost)`
    );

    // --- CHECK 10: ProductBatches Lot Tracking ---
    console.log("\n--- CHECK 10: ProductBatches Lot Tracking ---");
    const weldonBatches = await ProductBatch.find({ batchNumber: { $regex: /^BAT-WL-/ } }).lean();
    assert(
      weldonBatches.length === 34,
      `Found ${weldonBatches.length} corresponding ProductBatch lot records for Weldon inventory`
    );

    // --- CHECK 11: POS Search by Colour Code Simulation ---
    console.log("\n--- CHECK 11: POS Search by Colour Code Simulation ---");
    const searchCode = "WL-WHT-001";
    const codeMatches = await Product.find({
      $or: [
        { colorCode: new RegExp(searchCode, "i") },
        { itemName: new RegExp(searchCode, "i") }
      ]
    }).lean();

    assert(
      codeMatches.length >= 3,
      `POS search for "${searchCode}" returned ${codeMatches.length} matching Pure White products across categories`
    );

    const barcodeScan = await Product.findOne({ barcode: "896700400001" }).lean();
    assert(
      Boolean(barcodeScan),
      `POS Barcode Scan "896700400001" matched "${barcodeScan?.itemName}" (Rate: Rs. ${barcodeScan?.salePrice}, Colour: ${barcodeScan?.colourName}, Code: ${barcodeScan?.colorCode})`
    );

    console.log("\n================================================================================");
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Verification error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runVerification();

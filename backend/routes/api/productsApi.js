import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import Product from "../../models/Product.js";
import ItemDefinition from "../../models/ItemDefinition.js";
import StockAudit from "../../models/StockAudit.js";
import Brand from "../../models/Brand.js";
import Category from "../../models/Category.js";
import { isLoggedIn } from "../../middleware/isLoggedIn.js";
import { allowRoles } from "../../middleware/allowRoles.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../../public/uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function escapeRegExp(string) {
  if (!string) return "";
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Multer Storage for Product Images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "prod-" + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// GET /api/products
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const { search, category, brand, stockStatus, lowStock, expiringSoon, limit, page, all } = req.query;

    let query = {};

    if (search && search.trim() !== "") {
      const regex = new RegExp(escapeRegExp(search.trim()), "i");
      query.$or = [
        { itemName: regex },
        { barcode: regex },
        { sku: regex },
        { brandName: regex },
        { category: regex },
        { "packagingUnits.barcode": regex }
      ];
    }

    if (category && category !== "all" && category !== "All") {
      query.category = new RegExp(`^${escapeRegExp(category)}$`, "i");
    }

    if (brand && brand !== "all" && brand !== "All") {
      query.brandName = new RegExp(`^${escapeRegExp(brand)}$`, "i");
    }

    if (stockStatus === "in") {
      query.remaining = { $gt: 0 };
    } else if (stockStatus === "out") {
      query.remaining = { $lte: 0 };
    }

    if (lowStock === "true") {
      query.$expr = { $lte: ["$remaining", { $ifNull: ["$minStockAlert", 5] }] };
    }

    if (expiringSoon === "true") {
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      query.expiryDate = { $lte: thirtyDays, $gte: new Date() };
    }

    const isAll = all === "true" || all === true;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(limit) || 25));
    const skip = (pageNum - 1) * limitNum;

    // Parallel execution for stats, filters, and paginated product list
    const [
      totalCount,
      statsAgg,
      definitions,
      distinctCategories,
      distinctBrands,
      dbCategories,
      dbBrands,
      products
    ] = await Promise.all([
      Product.countDocuments(query),
      Product.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalStock: { $sum: { $ifNull: ["$totalProduct", 0] } },
            totalRemaining: { $sum: { $ifNull: ["$remaining", 0] } },
            totalValue: {
              $sum: {
                $multiply: [
                  { $ifNull: ["$totalProduct", 0] },
                  { $ifNull: ["$salePrice", { $ifNull: ["$rate", 0] }] }
                ]
              }
            },
            remainingValue: {
              $sum: {
                $multiply: [
                  { $ifNull: ["$remaining", 0] },
                  { $ifNull: ["$salePrice", { $ifNull: ["$rate", 0] }] }
                ]
              }
            }
          }
        }
      ]),
      ItemDefinition.find({}).lean(),
      Product.distinct("category"),
      Product.distinct("brandName"),
      Category.find({ isActive: true }).sort({ name: 1 }).lean(),
      Brand.find({ isActive: true }).sort({ name: 1 }).lean(),
      isAll
        ? Product.find(query).sort({ createdAt: -1 }).lean()
        : Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean()
    ]);

    const statsData = statsAgg[0] || {};
    const totalPages = isAll ? 1 : Math.ceil(totalCount / limitNum) || 1;

    const registeredCatNames = (dbCategories || []).map((c) => c.name);
    const categoriesList = [...new Set([...registeredCatNames, ...distinctCategories].filter(Boolean))];
    if (categoriesList.length === 0) {
      categoriesList.push("Grocery", "Beverages", "Dairy", "Snacks", "Household", "Personal Care", "General");
    }

    const registeredBrandNames = (dbBrands || []).map((b) => b.name);
    const brandsList = [...new Set([...registeredBrandNames, ...distinctBrands].filter(Boolean))];

    // RBAC: Sanitize costPrice / purchase price for unauthorized roles (Cashier / Worker)
    const userRole = req.user?.role || "cashier";
    const canSeeCost = ["admin", "superadmin", "manager"].includes(userRole);

    let finalProducts = products;
    if (!canSeeCost) {
      finalProducts = products.map((p) => {
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

    return res.json({
      success: true,
      products: finalProducts,
      pagination: {
        page: isAll ? 1 : pageNum,
        limit: isAll ? totalCount : limitNum,
        totalPages,
        totalProducts: totalCount,
        hasPrevPage: !isAll && pageNum > 1,
        hasNextPage: !isAll && pageNum < totalPages
      },
      categories: categoriesList,
      brands: brandsList,
      categoryObjects: dbCategories || [],
      brandObjects: dbBrands || [],
      definitions,
      stats: {
        totalProductsCount: totalCount,
        totalStock: statsData.totalStock || 0,
        totalRemaining: statsData.totalRemaining || 0,
        totalValue: Math.round(statsData.totalValue || 0),
        remainingValue: Math.round(statsData.remainingValue || 0)
      }
    });
  } catch (err) {
    console.error("Products List API Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products/export-csv
router.get("/export-csv", isLoggedIn, async (req, res) => {
  try {
    const products = await Product.find().sort({ itemName: 1 }).lean();
    const headers = [
      "Item Name",
      "Brand",
      "Category",
      "Barcode",
      "SKU",
      "Unit",
      "Cost Price",
      "Sale Price",
      "Total Stock",
      "Remaining Stock",
      "Min Stock Alert"
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = products.map((p) => [
      escapeCsv(p.itemName),
      escapeCsv(p.brandName || p.brand || ""),
      escapeCsv(p.category || "General"),
      escapeCsv(p.barcode || p.stockID || ""),
      escapeCsv(p.sku || ""),
      escapeCsv(p.unit || "pcs"),
      escapeCsv(p.costPrice || 0),
      escapeCsv(p.salePrice || p.rate || 0),
      escapeCsv(p.totalProduct || 0),
      escapeCsv(p.remaining || 0),
      escapeCsv(p.minStockAlert || 5)
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=inventory-${Date.now()}.csv`);
    return res.status(200).send("\uFEFF" + csvContent);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products/sample-csv
router.get("/sample-csv", (req, res) => {
  const headers = [
    "Item Name",
    "Brand",
    "Category",
    "Barcode",
    "SKU",
    "Unit",
    "Cost Price",
    "Sale Price",
    "Total Stock",
    "Remaining Stock",
    "Min Stock Alert"
  ];
  const sampleRows = [
    '"Nestle MilkPak 1 Litre","Nestle","Dairy","896400010012","MLK-001","ltr","280","330","100","100","10"',
    '"Lipton Yellow Label 475g","Unilever","Beverages","896400054321","TEA-002","pack","800","920","50","50","5"',
    '"Shan Biryani Masala 50g","Shan Foods","Spices","896400078901","SP-003","pack","95","120","200","200","20"'
  ];
  const csv = [headers.join(","), ...sampleRows].join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename=sample-inventory-template.csv');
  return res.status(200).send("\uFEFF" + csv);
});

// POST /api/products/import-csv
router.post("/import-csv", isLoggedIn, allowRoles("admin", "manager", "inventory"), async (req, res) => {
  try {
    const { csvData } = req.body;
    if (!csvData || typeof csvData !== "string") {
      return res.status(400).json({ success: false, message: "Valid CSV content is required." });
    }

    const lines = csvData.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ success: false, message: "CSV file is empty or has no data rows." });
    }

    const parseCsvLine = (line) => {
      const result = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (c === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = "";
        } else {
          cur += c;
        }
      }
      result.push(cur.trim());
      return result;
    };

    // 1. Parse and validate all rows
    const parsedRows = [];
    const barcodeList = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length < 4 || !cols[0]) continue;

      const itemName = cols[0].trim();
      const brandName = (cols[1] || "General").trim();
      const category = (cols[2] || "General").trim();
      const barcode = (cols[3] || `SKU-${Date.now()}-${i}`).trim();
      const sku = (cols[4] || barcode).trim();
      const unit = (cols[5] || "pcs").trim();
      const costPrice = Math.max(0, parseFloat(cols[6]) || 0);
      const salePrice = Math.max(0, parseFloat(cols[7]) || 0);
      const totalProduct = Math.max(0, parseFloat(cols[8]) || 0);
      const remaining = cols[9] !== undefined && cols[9] !== "" ? Math.max(0, parseFloat(cols[9])) : totalProduct;
      const minStockAlert = Math.max(0, parseFloat(cols[10]) || 5);

      parsedRows.push({
        itemName,
        brandName,
        category,
        barcode,
        sku,
        unit,
        costPrice,
        salePrice,
        totalProduct,
        remaining,
        minStockAlert
      });

      barcodeList.push(barcode, sku);
    }

    if (parsedRows.length === 0) {
      return res.status(400).json({ success: false, message: "No valid product rows found in CSV." });
    }

    // 2. Fetch all matching existing products in a single indexed query
    const existingProducts = await Product.find({
      $or: [
        { barcode: { $in: barcodeList } },
        { stockID: { $in: barcodeList } },
        { sku: { $in: barcodeList } }
      ]
    }).lean();

    const existingMap = new Map();
    existingProducts.forEach((p) => {
      if (p.barcode) existingMap.set(p.barcode, p);
      if (p.stockID) existingMap.set(p.stockID, p);
      if (p.sku) existingMap.set(p.sku, p);
    });

    // 3. Build bulkWrite operations with financial/stock safety
    const bulkOps = [];
    let importedCount = 0;
    let updatedCount = 0;

    for (const row of parsedRows) {
      const existing = existingMap.get(row.barcode) || existingMap.get(row.sku);

      if (existing) {
        // Safe update: update catalog details & pricing, NEVER silently overwrite active live stock
        bulkOps.push({
          updateOne: {
            filter: { _id: existing._id },
            update: {
              $set: {
                itemName: row.itemName,
                brandName: row.brandName,
                brand: row.brandName,
                category: row.category,
                costPrice: row.costPrice,
                salePrice: row.salePrice,
                rate: row.salePrice,
                minStockAlert: row.minStockAlert,
                unit: row.unit
              }
            }
          }
        });
        updatedCount++;
      } else {
        // Safe insert: new product with initial inventory
        bulkOps.push({
          insertOne: {
            document: {
              itemName: row.itemName,
              brandName: row.brandName,
              brand: row.brandName,
              category: row.category,
              barcode: row.barcode,
              stockID: row.barcode,
              sku: row.sku,
              unit: row.unit,
              costPrice: row.costPrice,
              salePrice: row.salePrice,
              rate: row.salePrice,
              totalProduct: row.totalProduct,
              remaining: row.remaining,
              minStockAlert: row.minStockAlert
            }
          }
        });
        importedCount++;
      }
    }

    // 4. Batch execution using bulkWrite (batches of 500)
    const BATCH_SIZE = 500;
    for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
      const batch = bulkOps.slice(i, i + BATCH_SIZE);
      await Product.bulkWrite(batch, { ordered: false });
    }

    return res.json({
      success: true,
      message: `CSV Processed successfully! Added: ${importedCount} new products, Updated: ${updatedCount} existing products. (Active stock preserved safely).`,
      importedCount,
      updatedCount
    });
  } catch (err) {
    console.error("CSV Import Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products/:id
router.get("/:id", isLoggedIn, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    return res.json({ success: true, product });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/products (Create with image upload)
router.post("/", isLoggedIn, allowRoles("admin", "manager", "inventory"), upload.single("productImage"), async (req, res) => {
  try {
    const {
      itemName,
      barcode,
      sku,
      brandName = "General",
      category = "General",
      colourName = "",
      unit = "pcs",
      allowDecimal = false,
      costPrice = 0,
      salePrice = 0,
      wholesalePrice = 0,
      minSellingPrice = 0,
      taxRate = 0,
      description = "",
      packagingUnits,
      rate,
      totalProduct = 1,
      minStockAlert = 5,
      expiryDate,
      imageUrl
    } = req.body;

    if (!itemName || itemName.trim() === "") {
      return res.status(400).json({ success: false, message: "Item Name is required." });
    }
    if (!brandName || brandName.trim() === "") {
      return res.status(400).json({ success: false, message: "Brand is required. Please select or add a brand." });
    }
    if (!category || category.trim() === "") {
      return res.status(400).json({ success: false, message: "Category is required. Please select or add a category." });
    }

    const priceRate = parseFloat(salePrice || rate || 0);
    const cost = parseFloat(costPrice || 0);
    const totalQty = parseFloat(totalProduct || 1);

    const isWeightVolume = ["kg", "g", "l", "ml", "kilogram", "gram", "liter", "milliliter"].includes((unit || "").trim().toLowerCase());
    const effectiveAllowDecimal = (allowDecimal === "true" || allowDecimal === true) || isWeightVolume;

    // Parse packaging units if provided
    let parsedPackagingUnits = [];
    if (packagingUnits) {
      try {
        parsedPackagingUnits = typeof packagingUnits === "string" ? JSON.parse(packagingUnits) : packagingUnits;
        if (!Array.isArray(parsedPackagingUnits)) parsedPackagingUnits = [];
      } catch (e) {
        parsedPackagingUnits = [];
      }
    }

    // Auto-generate barcode/stockID if not supplied
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const stockID = barcode && barcode.trim() !== "" 
      ? barcode.trim() 
      : `${itemName.slice(0, 3).toUpperCase()}-${randomSuffix}`;
    const finalBarcode = barcode && barcode.trim() !== "" ? barcode.trim() : stockID;

    // Check barcode conflict
    const existing = await Product.findOne({ stockID });
    if (existing) {
      return res.status(400).json({ success: false, message: `Barcode / Stock ID '${stockID}' is already in use by another product.` });
    }

    let finalImage = "/images/product-placeholder.svg";
    if (req.file) {
      finalImage = "/uploads/" + req.file.filename;
    } else if (imageUrl && imageUrl.trim() !== "") {
      finalImage = imageUrl.trim();
    }

    const newProduct = await Product.create({
      itemName: itemName.trim(),
      barcode: finalBarcode,
      sku: sku ? sku.trim() : finalBarcode,
      brandName: brandName.trim(),
      brand: brandName.trim(),
      category: category.trim(),
      colourName: colourName.trim(),
      unit: unit.trim(),
      qty: unit.trim(),
      allowDecimal: effectiveAllowDecimal,
      costPrice: cost,
      salePrice: priceRate,
      rate: priceRate,
      wholesalePrice: parseFloat(wholesalePrice) || 0,
      minSellingPrice: parseFloat(minSellingPrice) || 0,
      taxRate: parseFloat(taxRate) || 0,
      description: description ? description.trim() : "",
      packagingUnits: parsedPackagingUnits,
      totalProduct: totalQty,
      remaining: totalQty,
      minStockAlert: parseInt(minStockAlert) || 5,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      stockID,
      image: finalImage
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully!",
      product: newProduct
    });
  } catch (err) {
    console.error("Create Product Error:", err);
    return res.status(500).json({ success: false, message: "Failed to create product: " + err.message });
  }
});

// PUT /api/products/:id (Update product)
router.put("/:id", isLoggedIn, allowRoles("admin", "manager", "inventory"), upload.single("productImage"), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    const {
      itemName,
      barcode,
      sku,
      brandName,
      category,
      colourName,
      unit,
      allowDecimal,
      costPrice,
      salePrice,
      wholesalePrice,
      minSellingPrice,
      taxRate,
      description,
      packagingUnits,
      totalProduct,
      remaining,
      minStockAlert,
      expiryDate,
      imageUrl
    } = req.body;

    if (itemName) product.itemName = itemName.trim();
    if (barcode) product.barcode = barcode.trim();
    if (sku) product.sku = sku.trim();
    if (brandName) {
      product.brandName = brandName.trim();
      product.brand = brandName.trim();
    }
    if (category) product.category = category.trim();
    if (colourName !== undefined) product.colourName = colourName.trim();
    if (unit) {
      product.unit = unit.trim();
      product.qty = unit.trim();
      const isWV = ["kg", "g", "l", "ml", "kilogram", "gram", "liter", "milliliter"].includes(unit.trim().toLowerCase());
      if (isWV && allowDecimal === undefined) {
        product.allowDecimal = true;
      }
    }
    if (allowDecimal !== undefined) {
      product.allowDecimal = allowDecimal === "true" || allowDecimal === true;
    }
    if (costPrice !== undefined) product.costPrice = parseFloat(costPrice) || 0;
    if (salePrice !== undefined) {
      const p = parseFloat(salePrice) || 0;
      product.salePrice = p;
      product.rate = p;
    }
    if (wholesalePrice !== undefined) product.wholesalePrice = parseFloat(wholesalePrice) || 0;
    if (minSellingPrice !== undefined) product.minSellingPrice = parseFloat(minSellingPrice) || 0;
    if (taxRate !== undefined) product.taxRate = parseFloat(taxRate) || 0;
    if (description !== undefined) product.description = description.trim();
    if (packagingUnits !== undefined) {
      try {
        const units = typeof packagingUnits === "string" ? JSON.parse(packagingUnits) : packagingUnits;
        if (Array.isArray(units)) product.packagingUnits = units;
      } catch (e) {}
    }
    if (totalProduct !== undefined) product.totalProduct = parseFloat(totalProduct) || product.totalProduct;
    if (remaining !== undefined) product.remaining = parseFloat(remaining) || product.remaining;
    if (minStockAlert !== undefined) product.minStockAlert = parseInt(minStockAlert) || 5;
    if (expiryDate !== undefined) product.expiryDate = expiryDate ? new Date(expiryDate) : null;

    if (req.file) {
      product.image = "/uploads/" + req.file.filename;
    } else if (imageUrl && imageUrl.trim() !== "") {
      product.image = imageUrl.trim();
    }

    await product.save();

    return res.json({
      success: true,
      message: "Product updated successfully!",
      product
    });
  } catch (err) {
    console.error("Update Product Error:", err);
    return res.status(500).json({ success: false, message: "Failed to update product: " + err.message });
  }
});

// DELETE /api/products/:id
router.delete("/:id", isLoggedIn, allowRoles("admin"), async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    return res.json({ success: true, message: `Product '${deleted.itemName}' deleted successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/products/adjust-stock (Restock, Damaged, or Audit Correction)
router.post("/adjust-stock", isLoggedIn, allowRoles("admin", "manager", "inventory"), async (req, res) => {
  try {
    const { productId, adjustmentType, changeQuantity, quantity, qty, newTotalQuantity, reason } = req.body;
    const effectiveChangeQty = changeQuantity !== undefined ? changeQuantity : (quantity !== undefined ? quantity : qty);

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    const previousQty = product.remaining;
    let newQty = previousQty;
    let actualChange = 0;

    let normType = "Restock / Addition";
    if (/damage|expire/i.test(adjustmentType)) {
      normType = "Damaged / Expired";
    } else if (/audit|correct/i.test(adjustmentType)) {
      normType = "Audit Correction";
    } else if (/customer/i.test(adjustmentType)) {
      normType = "Returned from Customer";
    } else if (/supplier|company/i.test(adjustmentType)) {
      normType = "Supplier Return";
    }

    if (normType === "Restock / Addition") {
      const addQty = parseFloat(effectiveChangeQty) || 0;
      if (addQty <= 0) return res.status(400).json({ success: false, message: "Quantity to add must be greater than zero." });
      newQty = previousQty + addQty;
      product.totalProduct += addQty;
      product.remaining = newQty;
      actualChange = addQty;
    } else if (normType === "Damaged / Expired") {
      const deductQty = parseFloat(effectiveChangeQty) || 0;
      if (deductQty <= 0) return res.status(400).json({ success: false, message: "Deduction quantity must be greater than zero." });
      if (deductQty > previousQty) {
        return res.status(400).json({ success: false, message: `Cannot deduct ${deductQty} items. Only ${previousQty} available in stock.` });
      }
      newQty = previousQty - deductQty;
      product.remaining = newQty;
      actualChange = -deductQty;
    } else if (normType === "Audit Correction") {
      const auditedQty = parseFloat(newTotalQuantity !== undefined ? newTotalQuantity : effectiveChangeQty);
      if (isNaN(auditedQty) || auditedQty < 0) {
        return res.status(400).json({ success: false, message: "Valid physical audit quantity required." });
      }
      actualChange = auditedQty - previousQty;
      newQty = auditedQty;
      product.remaining = newQty;
      if (actualChange > 0) {
        product.totalProduct += actualChange;
      }
    }

    await product.save();

    // Record audit log
    const auditRecord = await StockAudit.create({
      productId: product._id,
      itemName: product.itemName,
      barcode: product.barcode || product.stockID,
      adjustmentType: normType,
      previousQuantity: previousQty,
      changeQuantity: actualChange,
      newQuantity: newQty,
      reason: reason || "",
      adjustedBy: req.user?.username || "Admin"
    });

    return res.json({
      success: true,
      message: `Stock adjusted successfully for ${product.itemName}. New stock: ${newQty}`,
      product,
      audit: auditRecord
    });
  } catch (err) {
    console.error("Stock Adjustment Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products/stock-audits
router.get("/stock-audits", isLoggedIn, async (req, res) => {
  try {
    const audits = await StockAudit.find().sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ success: true, audits });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/products/company-refund
router.post("/company-refund", isLoggedIn, allowRoles("admin", "manager"), async (req, res) => {
  try {
    const { stockID, refundQuantity, reason } = req.body;
    const qty = parseFloat(refundQuantity);

    if (!stockID || isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: "Valid stock ID and quantity are required." });
    }

    const product = await Product.findOne({ $or: [{ stockID }, { barcode: stockID }] });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    if (qty > product.remaining) {
      return res.status(400).json({ success: false, message: `Stock short! Available: ${product.remaining}, Requested: ${qty}` });
    }

    const previousQty = product.remaining;
    product.remaining -= qty;
    product.refundQuantity = (product.refundQuantity || 0) + qty;
    product.refundStatus = product.refundQuantity >= product.totalProduct ? "Fully Refunded" : "Partially Refunded";
    await product.save();

    await StockAudit.create({
      productId: product._id,
      itemName: product.itemName,
      barcode: product.barcode,
      adjustmentType: "Supplier Return",
      previousQuantity: previousQty,
      changeQuantity: -qty,
      newQuantity: product.remaining,
      reason: reason || "Returned to company / supplier",
      adjustedBy: req.user?.username || "Admin"
    });

    return res.json({
      success: true,
      message: `Successfully refunded ${qty} ${product.unit || 'items'} of "${product.itemName}" back to company/supplier.`,
      product
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

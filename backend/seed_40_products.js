import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./models/Product.js";
import ProductBatch from "./models/ProductBatch.js";
import Category from "./models/Category.js";
import Brand from "./models/Brand.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pos";

export const sampleProductsData = [
  // ==========================================
  // 1. GROCERY (4 items)
  // ==========================================
  {
    itemName: "Sunridge Super Fine Chakki Atta 10kg",
    brandName: "Sunridge",
    category: "Grocery",
    subcategory: "Flour & Atta",
    sku: "GRO-ATT-001",
    barcode: "896500100001",
    stockID: "ATT-8965001",
    costPrice: 1350,
    salePrice: 1550,
    rate: 1550,
    unit: "Bag",
    qty: "Bag",
    allowDecimal: false,
    totalProduct: 60,
    remaining: 45,
    minStockAlert: 10,
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
    description: "100% whole wheat chakki atta packed with dietary fiber and essential nutrients.",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Dalda Canola Cooking Oil 5 Litre Can",
    brandName: "Dalda",
    category: "Grocery",
    subcategory: "Edible Oils & Ghee",
    sku: "GRO-OIL-002",
    barcode: "896500100002",
    stockID: "OIL-8965002",
    costPrice: 2650,
    salePrice: 2950,
    rate: 2950,
    unit: "Litre",
    qty: "Litre",
    allowDecimal: true,
    totalProduct: 40,
    remaining: 28,
    minStockAlert: 8,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 12 months
    description: "Refined enriched canola cooking oil with Vitamin A, D and Omega 3 fatty acids.",
    image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Shan Special Bombay Biryani Masala 100g",
    brandName: "Shan",
    category: "Grocery",
    subcategory: "Spices & Recipe Mix",
    sku: "GRO-SPM-003",
    barcode: "896500100003",
    stockID: "SPM-8965003",
    costPrice: 110,
    salePrice: 140,
    rate: 140,
    unit: "Gram",
    qty: "Gram",
    allowDecimal: false,
    totalProduct: 150,
    remaining: 120,
    minStockAlert: 20,
    expiryDate: new Date(Date.now() + 540 * 24 * 60 * 60 * 1000), // 18 months
    description: "Authentic spice mix for royal aromatic Bombay style biryani rice dishes.",
    image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "National Mixed Pickle In Oil 1kg Bottle",
    brandName: "National",
    category: "Grocery",
    subcategory: "Pickles & Preserves",
    sku: "GRO-PCK-004",
    barcode: "896500100004",
    stockID: "PCK-8965004",
    costPrice: 380,
    salePrice: 460,
    rate: 460,
    unit: "Bottle",
    qty: "Bottle",
    allowDecimal: false,
    totalProduct: 35,
    remaining: 4, // LOW STOCK (4 < 10)
    minStockAlert: 10,
    expiryDate: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000), // 9 months
    description: "Traditional spicy mixed mango, carrot, lime and chili pickle cured in pure mustard oil.",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },

  // ==========================================
  // 2. DRY FOOD (4 items)
  // ==========================================
  {
    itemName: "Guard Supreme Super Kernel Basmati Rice 5kg",
    brandName: "Guard",
    category: "Dry Food",
    subcategory: "Rice & Grains",
    sku: "DRY-RCE-005",
    barcode: "896500100005",
    stockID: "RCE-8965005",
    costPrice: 1650,
    salePrice: 1950,
    rate: 1950,
    unit: "KG",
    qty: "KG",
    allowDecimal: true,
    totalProduct: 80,
    remaining: 62.5, // Decimal stock
    minStockAlert: 15,
    expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000), // 24 months
    description: "Long grain aged aromatic basmati rice ideal for weddings, pulao and fine dining.",
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Desi Daal Chana Washed Pulses 1kg",
    brandName: "Al-Khair",
    category: "Dry Food",
    subcategory: "Lentils & Pulses",
    sku: "DRY-DAL-006",
    barcode: "896500100006",
    stockID: "DAL-8965006",
    costPrice: 240,
    salePrice: 290,
    rate: 290,
    unit: "KG",
    qty: "KG",
    allowDecimal: true,
    totalProduct: 100,
    remaining: 18.5, // Decimal & LOW STOCK (18.5 < 20)
    minStockAlert: 20,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 12 months
    description: "Premium washed split yellow gram pulses, unpolished and protein rich.",
    image: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Kashmir Refined White Sugar 5kg Bag",
    brandName: "Kashmir",
    category: "Dry Food",
    subcategory: "Sugar & Sweeteners",
    sku: "DRY-SGR-007",
    barcode: "896500100007",
    stockID: "SGR-8965007",
    costPrice: 680,
    salePrice: 780,
    rate: 780,
    unit: "Bag",
    qty: "Bag",
    allowDecimal: false,
    totalProduct: 50,
    remaining: 35,
    minStockAlert: 10,
    expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000), // 24 months
    description: "Ultra-pure crystallized sugarcane white granulated sugar for sweets and beverages.",
    image: "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Gilgit Premium Kagzi Almonds Badam Giri 1kg",
    brandName: "Mountain Foods",
    category: "Dry Food",
    subcategory: "Dry Fruits & Nuts",
    sku: "DRY-ALM-008",
    barcode: "896500100008",
    stockID: "ALM-8965008",
    costPrice: 1800,
    salePrice: 2300,
    rate: 2300,
    unit: "KG",
    qty: "KG",
    allowDecimal: true,
    totalProduct: 30,
    remaining: 22,
    minStockAlert: 5,
    expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000), // 10 months
    description: "Fresh northern valley sweet almond kernels, naturally rich in Vitamin E.",
    image: "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },

  // ==========================================
  // 3. BEVERAGES (4 items)
  // ==========================================
  {
    itemName: "Coca-Cola 1.5 Litre PET Bottle",
    brandName: "Coca-Cola",
    category: "Beverages",
    subcategory: "Carbonated Soft Drinks",
    sku: "BEV-COK-009",
    barcode: "896500100009",
    stockID: "COK-8965009",
    costPrice: 165,
    salePrice: 210,
    rate: 210,
    unit: "Bottle",
    qty: "Bottle",
    allowDecimal: false,
    totalProduct: 120,
    remaining: 95,
    minStockAlert: 24,
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
    description: "Refreshing original sparkling cola beverage served ice-cold.",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Aquafina Purified Mineral Water 1.5L Bottle",
    brandName: "PepsiCo",
    category: "Beverages",
    subcategory: "Packaged Drinking Water",
    sku: "BEV-WTR-010",
    barcode: "896500100010",
    stockID: "WTR-8965010",
    costPrice: 80,
    salePrice: 110,
    rate: 110,
    unit: "Bottle",
    qty: "Bottle",
    allowDecimal: false,
    totalProduct: 200,
    remaining: 140,
    minStockAlert: 30,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 12 months
    description: "Pure reverse-osmosis filtered water with essential salts and balanced pH.",
    image: "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Nestlé Fruita Vitals Chaunsa Mango Nectar 1 Litre",
    brandName: "Nestlé",
    category: "Beverages",
    subcategory: "Fruit Juices & Nectars",
    sku: "BEV-JCE-011",
    barcode: "896500100011",
    stockID: "JCE-8965011",
    costPrice: 295,
    salePrice: 360,
    rate: 360,
    unit: "Litre",
    qty: "Litre",
    allowDecimal: false,
    totalProduct: 50,
    remaining: 3, // LOW STOCK (3 < 10)
    minStockAlert: 10,
    expiryDate: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000), // 5 months
    description: "Exotic rich Chaunsa mango pulp nectar, no added preservatives.",
    image: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Nescafé Classic Instant Coffee Glass Jar 100g",
    brandName: "Nestlé",
    category: "Beverages",
    subcategory: "Coffee & Tea",
    sku: "BEV-COF-012",
    barcode: "896500100012",
    stockID: "COF-8965012",
    costPrice: 920,
    salePrice: 1150,
    rate: 1150,
    unit: "Bottle",
    qty: "Bottle",
    allowDecimal: false,
    totalProduct: 25,
    remaining: 18,
    minStockAlert: 5,
    expiryDate: new Date(Date.now() + 540 * 24 * 60 * 60 * 1000), // 18 months
    description: "100% pure roasted robusta coffee granules with a rich full-bodied aroma.",
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },

  // ==========================================
  // 4. DAIRY PRODUCTS (4 items)
  // ==========================================
  {
    itemName: "Olper's UHT Pure Milk 1 Litre Carton (Pack of 12)",
    brandName: "Engro",
    category: "Dairy Products",
    subcategory: "UHT Milk",
    sku: "DAI-MLK-013",
    barcode: "896500100013",
    stockID: "MLK-8965013",
    costPrice: 3300,
    salePrice: 3960,
    rate: 3960,
    unit: "Carton",
    qty: "Carton",
    allowDecimal: false,
    totalProduct: 30,
    remaining: 24,
    minStockAlert: 5,
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months
    description: "Wholesome ultra-heat treated pure cow and buffalo milk carton bundle.",
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Nestlé Sweet'n Natural Yogurt 400g Cup",
    brandName: "Nestlé",
    category: "Dairy Products",
    subcategory: "Yogurt & Curd",
    sku: "DAI-YOG-014",
    barcode: "896500100014",
    stockID: "YOG-8965014",
    costPrice: 160,
    salePrice: 200,
    rate: 200,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 40,
    remaining: 2, // LOW STOCK (2 < 10)
    minStockAlert: 10,
    expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks (Near Expiry)
    description: "Creamy pasteurized sweetened plain yogurt cup made with live probiotics.",
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Adams Natural Cheddar Cheese Block 200g",
    brandName: "Adams",
    category: "Dairy Products",
    subcategory: "Cheese & Butter",
    sku: "DAI-CHZ-015",
    barcode: "896500100015",
    stockID: "CHZ-8965015",
    costPrice: 480,
    salePrice: 590,
    rate: 590,
    unit: "Packet",
    qty: "Packet",
    allowDecimal: false,
    totalProduct: 35,
    remaining: 22,
    minStockAlert: 8,
    expiryDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 4 months
    description: "Classic matured cheddar cheese vacuum packed, ideal for sandwiches and baking.",
    image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Nurpur Salted Creamery Butter 200g",
    brandName: "Nurpur",
    category: "Dairy Products",
    subcategory: "Butter & Margarine",
    sku: "DAI-BTR-016",
    barcode: "896500100016",
    stockID: "BTR-8965016",
    costPrice: 340,
    salePrice: 420,
    rate: 420,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 50,
    remaining: 38,
    minStockAlert: 10,
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months
    description: "Pure churned dairy salted golden butter for breakfast toasts and cooking.",
    image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },

  // ==========================================
  // 5. SNACKS (4 items)
  // ==========================================
  {
    itemName: "Lays French Cheese Potato Chips 65g",
    brandName: "PepsiCo",
    category: "Snacks",
    subcategory: "Potato Chips",
    sku: "SNK-LAY-017",
    barcode: "896500100017",
    stockID: "LAY-8965017",
    costPrice: 80,
    salePrice: 100,
    rate: 100,
    unit: "Packet",
    qty: "Packet",
    allowDecimal: false,
    totalProduct: 120,
    remaining: 90,
    minStockAlert: 20,
    expiryDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 4 months
    description: "Crispy crinkle-cut farm-grown potato chips infused with tangy French cheese seasoning.",
    image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Peek Freans Sooper Biscuits Family Pack Box",
    brandName: "EBM",
    category: "Snacks",
    subcategory: "Biscuits & Cookies",
    sku: "SNK-SOP-018",
    barcode: "896500100018",
    stockID: "SOP-8965018",
    costPrice: 115,
    salePrice: 140,
    rate: 140,
    unit: "Box",
    qty: "Box",
    allowDecimal: false,
    totalProduct: 80,
    remaining: 65,
    minStockAlert: 15,
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
    description: "Pakistan's favorite crispy sweet egg and milk cookies in a convenient family carton box.",
    image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Cadbury Dairy Milk Chocolate Silk Bar 150g",
    brandName: "Cadbury",
    category: "Snacks",
    subcategory: "Chocolates & Confectionery",
    sku: "SNK-CAD-019",
    barcode: "896500100019",
    stockID: "CAD-8965019",
    costPrice: 420,
    salePrice: 520,
    rate: 520,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 40,
    remaining: 5, // LOW STOCK (5 < 10)
    minStockAlert: 10,
    expiryDate: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000), // 8 months
    description: "Velvety smooth milk chocolate bar crafted with creamy dairy milk and cocoa butter.",
    image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Knorr Chatpatta Instant Noodles Family Pack (6 in 1)",
    brandName: "Unilever",
    category: "Snacks",
    subcategory: "Instant Noodles & Pasta",
    sku: "SNK-KNR-020",
    barcode: "896500100020",
    stockID: "KNR-8965020",
    costPrice: 290,
    salePrice: 360,
    rate: 360,
    unit: "Packet",
    qty: "Packet",
    allowDecimal: false,
    totalProduct: 70,
    remaining: 52,
    minStockAlert: 12,
    expiryDate: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000), // 9 months
    description: "Quick 2-minute snack noodles with spicy desi chatpatta tastemaker sachet.",
    image: "https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },

  // ==========================================
  // 6. PERSONAL CARE (4 items)
  // ==========================================
  {
    itemName: "Head & Shoulders Smooth & Silky Shampoo 360ml",
    brandName: "P&G",
    category: "Personal Care",
    subcategory: "Hair Care",
    sku: "PER-HNS-021",
    barcode: "896500100021",
    stockID: "HNS-8965021",
    costPrice: 720,
    salePrice: 890,
    rate: 890,
    unit: "ML",
    qty: "ML",
    allowDecimal: false,
    totalProduct: 45,
    remaining: 32,
    minStockAlert: 8,
    expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000), // 24 months
    description: "Clinically proven anti-dandruff hair cleanser leaving scalp clean and hair silky smooth.",
    image: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Lux Velvet Touch Jasmine Bath Soap 140g Bar",
    brandName: "Unilever",
    category: "Personal Care",
    subcategory: "Bath & Body",
    sku: "PER-LUX-022",
    barcode: "896500100022",
    stockID: "LUX-8965022",
    costPrice: 125,
    salePrice: 155,
    rate: 155,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 150,
    remaining: 110,
    minStockAlert: 24,
    expiryDate: new Date(Date.now() + 1095 * 24 * 60 * 60 * 1000), // 36 months
    description: "Moisturizing beauty soap bar infused with Jasmine flower essence and Silk oil.",
    image: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Colgate MaxFresh Spicy Fresh Toothpaste 150g",
    brandName: "Colgate",
    category: "Personal Care",
    subcategory: "Oral Care",
    sku: "PER-COL-023",
    barcode: "896500100023",
    stockID: "COL-8965023",
    costPrice: 210,
    salePrice: 260,
    rate: 260,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 80,
    remaining: 4, // LOW STOCK (4 < 12)
    minStockAlert: 12,
    expiryDate: new Date(Date.now() + 540 * 24 * 60 * 60 * 1000), // 18 months
    description: "Cooling crystals dental paste providing 10x longer fresh breath and cavity protection.",
    image: "https://images.unsplash.com/photo-1559599101-f09722fb4948?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Dettol Instant Hand Sanitizer Original 200ml Bottle",
    brandName: "Reckitt",
    category: "Personal Care",
    subcategory: "Hygiene & Protection",
    sku: "PER-DTL-024",
    barcode: "896500100024",
    stockID: "DTL-8965024",
    costPrice: 280,
    salePrice: 350,
    rate: 350,
    unit: "Bottle",
    qty: "Bottle",
    allowDecimal: false,
    totalProduct: 60,
    remaining: 46,
    minStockAlert: 10,
    expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000), // 24 months
    description: "Rinse-free alcohol based antiseptic gel killing 99.9% germs without water.",
    image: "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },

  // ==========================================
  // 7. CLEANING PRODUCTS (4 items)
  // ==========================================
  {
    itemName: "Lemon Max Antibacterial Liquid Dishwash 450ml",
    brandName: "Colgate",
    category: "Cleaning Products",
    subcategory: "Dishwashing",
    sku: "CLN-MAX-025",
    barcode: "896500100025",
    stockID: "MAX-8965025",
    costPrice: 230,
    salePrice: 285,
    rate: 285,
    unit: "ML",
    qty: "ML",
    allowDecimal: false,
    totalProduct: 70,
    remaining: 54,
    minStockAlert: 12,
    expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000), // 24 months
    description: "Concentrated degreasing formula with fresh lemon power that cleans greasy utensils effortlessly.",
    image: "https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Surf Excel Quick Wash Detergent Powder 1kg Bag",
    brandName: "Unilever",
    category: "Cleaning Products",
    subcategory: "Laundry Care",
    sku: "CLN-SRF-026",
    barcode: "896500100026",
    stockID: "SRF-8965026",
    costPrice: 490,
    salePrice: 590,
    rate: 590,
    unit: "Bag",
    qty: "Bag",
    allowDecimal: false,
    totalProduct: 80,
    remaining: 65,
    minStockAlert: 15,
    expiryDate: new Date(Date.now() + 1095 * 24 * 60 * 60 * 1000), // 36 months
    description: "Super stain-removal washing powder designed for hand wash and semi-automatic machines.",
    image: "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Dettol Pine Disinfectant Floor Cleaner 1 Litre",
    brandName: "Reckitt",
    category: "Cleaning Products",
    subcategory: "Surface & Floor Cleaners",
    sku: "CLN-FLR-027",
    barcode: "896500100027",
    stockID: "FLR-8965027",
    costPrice: 580,
    salePrice: 720,
    rate: 720,
    unit: "Litre",
    qty: "Litre",
    allowDecimal: false,
    totalProduct: 40,
    remaining: 28,
    minStockAlert: 8,
    expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000), // 24 months
    description: "Antibacterial multi-surface floor wash eliminating bad odors and leaving pleasant pine scent.",
    image: "https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Harpic Power Plus 10X Max Toilet Cleaner 750ml Bottle",
    brandName: "Reckitt",
    category: "Cleaning Products",
    subcategory: "Bathroom & Toilet Cleaners",
    sku: "CLN-HRP-028",
    barcode: "896500100028",
    stockID: "HRP-8965028",
    costPrice: 360,
    salePrice: 450,
    rate: 450,
    unit: "Bottle",
    qty: "Bottle",
    allowDecimal: false,
    totalProduct: 55,
    remaining: 3, // LOW STOCK (3 < 10)
    minStockAlert: 10,
    expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000), // 24 months
    description: "Thick hydrochloric active formula removing 100% limescale and tough yellow stains.",
    image: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },

  // ==========================================
  // 8. HARDWARE (4 items)
  // ==========================================
  {
    itemName: "Ingco Steel Claw Hammer 16oz Rubberized Grip",
    brandName: "Ingco",
    category: "Hardware",
    subcategory: "Hand Tools",
    sku: "HDW-HAM-029",
    barcode: "896500100029",
    stockID: "HAM-8965029",
    costPrice: 850,
    salePrice: 1150,
    rate: 1150,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 25,
    remaining: 18,
    minStockAlert: 5,
    expiryDate: null, // Non-perishable
    description: "Drop-forged high-carbon steel 45# claw hammer with ergonomic shockproof fiberglass handle.",
    image: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Total Tools 6-Piece Magnetic Screwdriver Set Box",
    brandName: "Total Tools",
    category: "Hardware",
    subcategory: "Hand Tools & Sets",
    sku: "HDW-SCR-030",
    barcode: "896500100030",
    stockID: "SCR-8965030",
    costPrice: 1200,
    salePrice: 1650,
    rate: 1650,
    unit: "Box",
    qty: "Box",
    allowDecimal: false,
    totalProduct: 20,
    remaining: 14,
    minStockAlert: 4,
    expiryDate: null, // Non-perishable
    description: "Chrome Vanadium CR-V hardened steel screwdrivers (3 slotted, 3 phillips) in durable storage box.",
    image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Popular PVC Water Supply Pipe 1-Inch Class B (Per Meter)",
    brandName: "Popular Pipes",
    category: "Hardware",
    subcategory: "Plumbing & Pipes",
    sku: "HDW-PIP-031",
    barcode: "896500100031",
    stockID: "PIP-8965031",
    costPrice: 180,
    salePrice: 240,
    rate: 240,
    unit: "Meter",
    qty: "Meter",
    allowDecimal: true,
    totalProduct: 150,
    remaining: 85.5, // Decimal stock
    minStockAlert: 20,
    expiryDate: null, // Non-perishable
    description: "Heavy duty non-corrosive uPVC plumbing pipe for potable cold water pressure supply lines.",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Tri-Circle Solid Brass Heavy Duty Padlock 50mm",
    brandName: "Tri-Circle",
    category: "Hardware",
    subcategory: "Locks & Security",
    sku: "HDW-LCK-032",
    barcode: "896500100032",
    stockID: "LCK-8965032",
    costPrice: 650,
    salePrice: 880,
    rate: 880,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 30,
    remaining: 2, // LOW STOCK (2 < 6)
    minStockAlert: 6,
    expiryDate: null, // Non-perishable
    description: "Weather-resistant solid extruded brass padlock cylinder with hardened steel shackle and 3 keys.",
    image: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },

  // ==========================================
  // 9. PAINT (4 items with paint specialty)
  // ==========================================
  {
    itemName: "Master Paints Royal Silk Luxury Emulsion 1 Gallon",
    brandName: "Master Paints",
    category: "Paint",
    subcategory: "Interior Emulsion",
    sku: "PNT-MST-033",
    barcode: "896500100033",
    stockID: "MST-8965033",
    costPrice: 3850,
    salePrice: 4950,
    rate: 4950,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 24,
    remaining: 16,
    minStockAlert: 5,
    expiryDate: null, // Non-perishable
    description: "Ultra-luxury washable architectural interior emulsion with smooth eggshell sheen and anti-fungal shield.",
    image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=400&q=80",
    isPaint: true,
    paintType: "Luxury Emulsion",
    colourName: "Royal Silk Off-White",
    colorCode: "MP-102",
    shadeNumber: "SN-1024",
    paintSize: "1 Gallon (3.78L)",
    finish: "Eggshell Silk",
    customColorInfo: "Base A interior architectural formula"
  },
  {
    itemName: "Berger WeatherCoat Exterior Acrylic Finish 4 Litres",
    brandName: "Berger",
    category: "Paint",
    subcategory: "Exterior Protection",
    sku: "PNT-BRG-034",
    barcode: "896500100034",
    stockID: "BRG-8965034",
    costPrice: 4600,
    salePrice: 5800,
    rate: 5800,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 20,
    remaining: 12,
    minStockAlert: 4,
    expiryDate: null, // Non-perishable
    description: "Heavy duty exterior weather-proof acrylic wall finish protecting against harsh monsoons and UV rays.",
    image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80",
    isPaint: true,
    paintType: "WeatherCoat Exterior",
    colourName: "WeatherCoat Ash Gray",
    colorCode: "BP-704",
    shadeNumber: "SN-7045",
    paintSize: "4 Litres",
    finish: "Matt Flat",
    customColorInfo: "UV-Resistant Exterior Grade Tint"
  },
  {
    itemName: "Brighto Super Synthetic Gloss Enamel Quarter 0.91L",
    brandName: "Brighto",
    category: "Paint",
    subcategory: "Synthetic Enamel",
    sku: "PNT-BRT-035",
    barcode: "896500100035",
    stockID: "BRT-8965035",
    costPrice: 1100,
    salePrice: 1450,
    rate: 1450,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 30,
    remaining: 2, // LOW STOCK (2 < 8)
    minStockAlert: 8,
    expiryDate: null, // Non-perishable
    description: "High-gloss top-tier alkyd enamel paint for gates, metal railings, wooden doors and trims.",
    image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80",
    isPaint: true,
    paintType: "Synthetic Enamel",
    colourName: "Super Gloss Emerald Green",
    colorCode: "BR-501",
    shadeNumber: "SN-5012",
    paintSize: "Quarter (0.91L)",
    finish: "High Gloss",
    customColorInfo: "High-shine oil-based wood & metal enamel"
  },
  {
    itemName: "Diamond Wood Varnish Clear Lacquer Finish 1 Litre",
    brandName: "Diamond Paints",
    category: "Paint",
    subcategory: "Wood Coatings & Varnish",
    sku: "PNT-DMD-036",
    barcode: "896500100036",
    stockID: "DMD-8965036",
    costPrice: 950,
    salePrice: 1280,
    rate: 1280,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 18,
    remaining: 14,
    minStockAlert: 4,
    expiryDate: null, // Non-perishable
    description: "Crystal clear polyurethane wood stain and varnish enhancing natural timber grains and luster.",
    image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&q=80",
    isPaint: true,
    paintType: "Wood Varnish",
    colourName: "Golden Teak Clear",
    colorCode: "DM-303",
    shadeNumber: "SN-3038",
    paintSize: "1 Litre",
    finish: "Clear Satin",
    customColorInfo: "Natural grain enhancer for furniture & cabinets"
  },

  // ==========================================
  // 10. ELECTRICAL ITEMS (4 items)
  // ==========================================
  {
    itemName: "Fast Cables 3/29 Pure Copper Single Core Wire (Per Meter)",
    brandName: "Fast Cables",
    category: "Electrical Items",
    subcategory: "Wires & Cables",
    sku: "ELE-FST-037",
    barcode: "896500100037",
    stockID: "FST-8965037",
    costPrice: 140,
    salePrice: 185,
    rate: 185,
    unit: "Meter",
    qty: "Meter",
    allowDecimal: true,
    totalProduct: 200,
    remaining: 142.5, // Decimal stock
    minStockAlert: 25,
    expiryDate: null, // Non-perishable
    description: "99.9% pure electrolytic annealed copper conductor insulated with flame-retardant PVC sheath.",
    image: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Philips 18W T8 LED Glass Tube Light 4 Feet Daylight",
    brandName: "Philips",
    category: "Electrical Items",
    subcategory: "Lighting & Bulbs",
    sku: "ELE-PHL-038",
    barcode: "896500100038",
    stockID: "PHL-8965038",
    costPrice: 620,
    salePrice: 850,
    rate: 850,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 40,
    remaining: 28,
    minStockAlert: 8,
    expiryDate: null, // Non-perishable
    description: "High-efficiency 18 Watt 6500K Cool Daylight T8 linear LED glass tube with 50,000 burning hours.",
    image: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Schneider Electric Miniature Circuit Breaker MCB 20A 1-Pole",
    brandName: "Schneider",
    category: "Electrical Items",
    subcategory: "Circuit Breakers & Switchgear",
    sku: "ELE-SCH-039",
    barcode: "896500100039",
    stockID: "SCH-8965039",
    costPrice: 750,
    salePrice: 1050,
    rate: 1050,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 30,
    remaining: 3, // LOW STOCK (3 < 6)
    minStockAlert: 6,
    expiryDate: null, // Non-perishable
    description: "C-curve DIN-rail mounted 20 Amp thermal magnetic overcurrent protection circuit breaker.",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "PEL Universal 6-Way Multi-Plug Extension Board with Surge Protection Box",
    brandName: "PEL",
    category: "Electrical Items",
    subcategory: "Switches & Extensions",
    sku: "ELE-PEL-040",
    barcode: "896500100040",
    stockID: "PEL-8965040",
    costPrice: 1100,
    salePrice: 1490,
    rate: 1490,
    unit: "Box",
    qty: "Box",
    allowDecimal: false,
    totalProduct: 25,
    remaining: 18,
    minStockAlert: 5,
    expiryDate: null, // Non-perishable
    description: "Heavy-duty 6-socket universal power extension cord with individual switches, indicator lights and overload fuse.",
    image: "https://images.unsplash.com/photo-1544717302-de2939b7ef71?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  }
];

async function seedDatabase() {
  console.log("================================================================================");
  console.log("  SEEDING EXACTLY 40 REALISTIC TEST PRODUCTS INTO DEVELOPMENT DATABASE");
  console.log("================================================================================\n");

  await mongoose.connect(MONGO_URI);
  console.log("✅ MongoDB Connected Successfully to:", MONGO_URI);

  const dbName = mongoose.connection.name;
  console.log(`🔍 Verified Database Name: "${dbName}"`);

  if (dbName !== "pos") {
    throw new Error(`SAFETY CHECK FAILED: Expected dev database 'pos', but connected to '${dbName}'! Aborting.`);
  }

  // 1. Ensure required Categories exist
  const categoriesList = [
    "Grocery",
    "Dry Food",
    "Beverages",
    "Dairy Products",
    "Snacks",
    "Personal Care",
    "Cleaning Products",
    "Hardware",
    "Paint",
    "Electrical Items"
  ];

  console.log("\n--- STEP 1: Synchronizing Categories ---");
  for (const catName of categoriesList) {
    const exists = await Category.findOne({ name: catName });
    if (!exists) {
      await Category.create({ name: catName, isActive: true });
      console.log(`  + Created Category: "${catName}"`);
    } else {
      console.log(`  ✓ Category exists: "${catName}"`);
    }
  }

  // 2. Ensure required Brands exist
  const brandsList = [
    "Sunridge", "Dalda", "Shan", "National", "Guard", "Al-Khair", "Kashmir", "Mountain Foods",
    "Coca-Cola", "PepsiCo", "Nestlé", "Engro", "Adams", "Nurpur", "EBM", "Cadbury",
    "Unilever", "P&G", "Colgate", "Reckitt", "Ingco", "Total Tools", "Popular Pipes",
    "Tri-Circle", "Master Paints", "Berger", "Brighto", "Diamond Paints", "Fast Cables",
    "Philips", "Schneider", "PEL"
  ];

  console.log("\n--- STEP 2: Synchronizing Brands ---");
  for (const bName of brandsList) {
    const exists = await Brand.findOne({ name: bName });
    if (!exists) {
      await Brand.create({ name: bName, isActive: true });
      console.log(`  + Created Brand: "${bName}"`);
    } else {
      console.log(`  ✓ Brand exists: "${bName}"`);
    }
  }

  // 3. Upsert exactly 40 products
  console.log("\n--- STEP 3: Inserting 40 Realistic Products ---");
  let insertedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < sampleProductsData.length; i++) {
    const pData = sampleProductsData[i];
    const indexNum = i + 1;

    // Check if product exists by barcode or SKU
    let existing = await Product.findOne({
      $or: [
        { barcode: pData.barcode },
        { sku: pData.sku },
        { stockID: pData.stockID }
      ]
    });

    if (existing) {
      // Update existing record to guarantee latest realistic data
      Object.assign(existing, pData);
      existing.brand = pData.brandName;
      await existing.save();
      updatedCount++;
      console.log(`  [${String(indexNum).padStart(2, "0")}/40] 🔄 Updated: "${existing.itemName}" (${existing.sku})`);
    } else {
      // Insert new product
      const newProd = await Product.create({
        ...pData,
        brand: pData.brandName
      });
      existing = newProd;
      insertedCount++;
      console.log(`  [${String(indexNum).padStart(2, "0")}/40] ➕ Inserted: "${newProd.itemName}" (${newProd.sku})`);
    }

    // Ensure ProductBatch exists for lot tracking
    const batchNum = `BAT-${pData.sku}`;
    let batch = await ProductBatch.findOne({ batchNumber: batchNum });
    if (!batch) {
      await ProductBatch.create({
        productId: existing._id,
        batchNumber: batchNum,
        quantityReceived: pData.totalProduct,
        quantityRemaining: pData.remaining,
        costPrice: pData.costPrice,
        salePrice: pData.salePrice,
        expiryDate: pData.expiryDate,
        status: "Active",
        notes: `Initial stock seed for ${existing.itemName}`
      });
    } else {
      batch.quantityRemaining = pData.remaining;
      batch.costPrice = pData.costPrice;
      batch.salePrice = pData.salePrice;
      batch.expiryDate = pData.expiryDate;
      await batch.save();
    }
  }

  console.log(`\n✅ Finished Processing: ${insertedCount} newly inserted, ${updatedCount} updated.`);

  // 4. Verification Check
  console.log("\n--- STEP 4: Comprehensive Seed Verification ---");
  const seededBarcodes = sampleProductsData.map(p => p.barcode);
  const foundProducts = await Product.find({ barcode: { $in: seededBarcodes } }).lean();

  console.log(`📦 Seeded Products in Database: ${foundProducts.length} of ${sampleProductsData.length}`);

  if (foundProducts.length !== 40) {
    throw new Error(`Expected exactly 40 seeded products in database, but found ${foundProducts.length}!`);
  }

  // Verify Categories breakdown
  const categoryCounts = {};
  for (const p of foundProducts) {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  }
  console.log("📊 Category Distribution (Exact 4 per category):");
  for (const [cat, cnt] of Object.entries(categoryCounts)) {
    console.log(`   - ${cat.padEnd(20)}: ${cnt} products`);
  }

  // Verify Low stock items
  const lowStockItems = foundProducts.filter(p => p.remaining <= p.minStockAlert);
  console.log(`\n⚠️ Low Stock Alert Items: ${lowStockItems.length} products`);
  lowStockItems.forEach(p => console.log(`   • ${p.itemName} (Stock: ${p.remaining} ${p.unit}, Alert: ${p.minStockAlert})`));

  // Verify Decimal items
  const decimalItems = foundProducts.filter(p => p.allowDecimal || p.remaining % 1 !== 0);
  console.log(`\n⚖️ Decimal Quantity Items: ${decimalItems.length} products`);
  decimalItems.forEach(p => console.log(`   • ${p.itemName}: ${p.remaining} ${p.unit}`));

  // Verify Paint items
  const paintItems = foundProducts.filter(p => p.isPaint);
  console.log(`\n🎨 Paint Specialty Products: ${paintItems.length} products`);
  paintItems.forEach(p => console.log(`   • ${p.itemName} [${p.colorCode} - ${p.finish} - ${p.paintSize}]`));

  console.log("\n================================================================================");
  console.log("  SUCCESS! EXACTLY 40 REALISTIC TEST PRODUCTS LIVE IN DATABASE");
  console.log("================================================================================\n");

  await mongoose.disconnect();
}

if (process.argv[1] && process.argv[1].includes("seed_40_products")) {
  seedDatabase().catch(err => {
    console.error("❌ Seed Script Error:", err);
    process.exit(1);
  });
}

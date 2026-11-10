import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./models/Product.js";
import ProductBatch from "./models/ProductBatch.js";
import Category from "./models/Category.js";
import Brand from "./models/Brand.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pos";

export const new60ProductsData = [
  // =========================================================================
  // 1. GROCERY (5 products)
  // =========================================================================
  {
    itemName: "Bake Parlor All-Purpose Maida Flour 5kg Bag",
    brandName: "Bake Parlor",
    category: "Grocery",
    subcategory: "Flour & Bakery Supplies",
    sku: "GRO-MDA-001",
    barcode: "896600200001",
    stockID: "MDA-8966001",
    costPrice: 720,
    salePrice: 850,
    rate: 850,
    unit: "Bag",
    qty: "Bag",
    allowDecimal: false,
    totalProduct: 40,
    remaining: 32,
    minStockAlert: 8,
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
    description: "Ultra-fine premium all-purpose white flour (Maida) for bread, parathas and cakes.",
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Sufi Banaspati Cooking Oil 5 Litre Can",
    brandName: "Sufi",
    category: "Grocery",
    subcategory: "Edible Oils & Ghee",
    sku: "GRO-SUF-002",
    barcode: "896600200002",
    stockID: "SUF-8966002",
    costPrice: 2550,
    salePrice: 2890,
    rate: 2890,
    unit: "Litre",
    qty: "Litre",
    allowDecimal: true,
    totalProduct: 35,
    remaining: 18.5, // Decimal stock
    minStockAlert: 6,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 12 months
    description: "Vitamin A and D fortified pure vegetable cooking oil with low cholesterol.",
    image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "National Garam Masala Whole & Powdered 50g",
    brandName: "National",
    category: "Grocery",
    subcategory: "Spices & Seasonings",
    sku: "GRO-GRM-003",
    barcode: "896600200003",
    stockID: "GRM-8966003",
    costPrice: 95,
    salePrice: 125,
    rate: 125,
    unit: "Gram",
    qty: "Gram",
    allowDecimal: false,
    totalProduct: 120,
    remaining: 95,
    minStockAlert: 15,
    expiryDate: new Date(Date.now() + 540 * 24 * 60 * 60 * 1000), // 18 months
    description: "Finely ground aromatic blend of black cardamom, cloves, cinnamon and cumin.",
    image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Mehran Pure Desi Ghee 1kg Tin",
    brandName: "Mehran",
    category: "Grocery",
    subcategory: "Desi Ghee & Fats",
    sku: "GRO-GHE-004",
    barcode: "896600200004",
    stockID: "GHE-8966004",
    costPrice: 2400,
    salePrice: 2850,
    rate: 2850,
    unit: "KG",
    qty: "KG",
    allowDecimal: true,
    totalProduct: 25,
    remaining: 3, // LOW STOCK (3 < 6)
    minStockAlert: 6,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    description: "Traditional golden churned butterfat ghee with authentic desi aroma.",
    image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Mitchell's Tomato Paste 400g Can",
    brandName: "Mitchell's",
    category: "Grocery",
    subcategory: "Canned Food & Purees",
    sku: "GRO-TOM-005",
    barcode: "896600200005",
    stockID: "TOM-8966005",
    costPrice: 210,
    salePrice: 260,
    rate: 260,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 60,
    remaining: 44,
    minStockAlert: 10,
    expiryDate: new Date(Date.now() + 450 * 24 * 60 * 60 * 1000),
    description: "Concentrated sun-ripened Pakistani farm tomato puree for gravies and stews.",
    image: "https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },

  // =========================================================================
  // 2. DRY FOOD (5 products)
  // =========================================================================
  {
    itemName: "Al-Barakah Super Basmati Sella Rice 10kg Bag",
    brandName: "Al-Barakah",
    category: "Dry Food",
    subcategory: "Rice & Grains",
    sku: "DRY-SEL-006",
    barcode: "896600200006",
    stockID: "SEL-8966006",
    costPrice: 3200,
    salePrice: 3750,
    rate: 3750,
    unit: "KG",
    qty: "KG",
    allowDecimal: true,
    totalProduct: 60,
    remaining: 45.5, // Decimal stock
    minStockAlert: 10,
    expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
    description: "Parboiled golden extra-long grain sella basmati rice designed for commercial catering.",
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Daal Moong Washed Yellow Pulses 1kg",
    brandName: "Al-Khair",
    category: "Dry Food",
    subcategory: "Lentils & Pulses",
    sku: "DRY-MNG-007",
    barcode: "896600200007",
    stockID: "MNG-8966007",
    costPrice: 280,
    salePrice: 340,
    rate: 340,
    unit: "KG",
    qty: "KG",
    allowDecimal: true,
    totalProduct: 80,
    remaining: 14.5, // Decimal & LOW STOCK (14.5 < 18)
    minStockAlert: 18,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    description: "Easy to digest split yellow gram moong dal, machine-cleaned without stones.",
    image: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Al-Fateh Pure White Refined Sugar 10kg Bag",
    brandName: "Al-Fateh",
    category: "Dry Food",
    subcategory: "Sugar & Sweeteners",
    sku: "DRY-SGR-008",
    barcode: "896600200008",
    stockID: "SGR-8966008",
    costPrice: 1350,
    salePrice: 1550,
    rate: 1550,
    unit: "Bag",
    qty: "Bag",
    allowDecimal: false,
    totalProduct: 50,
    remaining: 38,
    minStockAlert: 10,
    expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
    description: "Sparkling crystalline pure cane sugar in durable sealed woven bag.",
    image: "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Swat Valley Shelled Walnuts Akhrot Giri 500g",
    brandName: "Northern Valley",
    category: "Dry Food",
    subcategory: "Dry Fruits & Nuts",
    sku: "DRY-WAL-009",
    barcode: "896600200009",
    stockID: "WAL-8966009",
    costPrice: 1100,
    salePrice: 1450,
    rate: 1450,
    unit: "Packet",
    qty: "Packet",
    allowDecimal: false,
    totalProduct: 40,
    remaining: 26,
    minStockAlert: 6,
    expiryDate: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000),
    description: "Organic light butterfly walnut halves rich in Omega-3 brain fatty acids.",
    image: "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Roasted Salted Kaju Cashew Nuts 250g",
    brandName: "Northern Valley",
    category: "Dry Food",
    subcategory: "Dry Fruits & Nuts",
    sku: "DRY-KAJ-010",
    barcode: "896600200010",
    stockID: "KAJ-8966010",
    costPrice: 950,
    salePrice: 1250,
    rate: 1250,
    unit: "Packet",
    qty: "Packet",
    allowDecimal: false,
    totalProduct: 30,
    remaining: 4, // LOW STOCK (4 < 8)
    minStockAlert: 8,
    expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
    description: "Jumbo premium grade cashews oven-roasted with a pinch of Himalayan pink salt.",
    image: "https://images.unsplash.com/photo-1543362906-acfc16c67564?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },

  // =========================================================================
  // 3. BEVERAGES (6 products)
  // =========================================================================
  {
    itemName: "Sprite Lemon-Lime Soda 1.5 Litre PET Bottle",
    brandName: "Coca-Cola",
    category: "Beverages",
    subcategory: "Carbonated Soft Drinks",
    sku: "BEV-SPR-011",
    barcode: "896600200011",
    stockID: "SPR-8966011",
    costPrice: 165,
    salePrice: 210,
    rate: 210,
    unit: "Bottle",
    qty: "Bottle",
    allowDecimal: false,
    totalProduct: 140,
    remaining: 105,
    minStockAlert: 24,
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    description: "Crisp and clear lemon-lime sparkling thirst quencher.",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Nestle Pure Life Mineral Water 1.5L Bottle",
    brandName: "Nestlé",
    category: "Beverages",
    subcategory: "Packaged Drinking Water",
    sku: "BEV-NPW-012",
    barcode: "896600200012",
    stockID: "NPW-8966012",
    costPrice: 85,
    salePrice: 115,
    rate: 115,
    unit: "Bottle",
    qty: "Bottle",
    allowDecimal: false,
    totalProduct: 180,
    remaining: 135,
    minStockAlert: 30,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    description: "Pure multi-stage filtered mineral drinking water with light crisp taste.",
    image: "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Shezan All-Natural Red Apple Juice 1 Litre",
    brandName: "Shezan",
    category: "Beverages",
    subcategory: "Fruit Juices",
    sku: "BEV-SHZ-013",
    barcode: "896600200013",
    stockID: "SHZ-8966013",
    costPrice: 260,
    salePrice: 320,
    rate: 320,
    unit: "Litre",
    qty: "Litre",
    allowDecimal: false,
    totalProduct: 45,
    remaining: 32,
    minStockAlert: 10,
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    description: "Clarified orchard apple juice with natural vitamin C and zero artificial flavors.",
    image: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Tapal Danedar Black Tea 450g Pouch",
    brandName: "Tapal",
    category: "Beverages",
    subcategory: "Tea & Chai",
    sku: "BEV-TPL-014",
    barcode: "896600200014",
    stockID: "TPL-8966014",
    costPrice: 740,
    salePrice: 880,
    rate: 880,
    unit: "Gram",
    qty: "Gram",
    allowDecimal: false,
    totalProduct: 90,
    remaining: 70,
    minStockAlert: 15,
    expiryDate: new Date(Date.now() + 540 * 24 * 60 * 60 * 1000),
    description: "Distinctive granular Kenyan black tea leaves delivering golden color and robust karak chai.",
    image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Pakola Ice Cream Soda 250ml Cans (Carton of 24)",
    brandName: "Pakola",
    category: "Beverages",
    subcategory: "Specialty Beverages",
    sku: "BEV-PAK-015",
    barcode: "896600200015",
    stockID: "PAK-8966015",
    costPrice: 2150,
    salePrice: 2640,
    rate: 2640,
    unit: "Carton",
    qty: "Carton",
    allowDecimal: false,
    totalProduct: 25,
    remaining: 3, // LOW STOCK (3 < 6)
    minStockAlert: 6,
    expiryDate: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000),
    description: "The historic green creamy vanilla soda beverage of Pakistan in ready-to-chill cans.",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Davidoff Rich Aroma Instant Coffee Glass Jar 100g",
    brandName: "Davidoff",
    category: "Beverages",
    subcategory: "Coffee & Espresso",
    sku: "BEV-DAV-016",
    barcode: "896600200016",
    stockID: "DAV-8966016",
    costPrice: 1850,
    salePrice: 2350,
    rate: 2350,
    unit: "Bottle",
    qty: "Bottle",
    allowDecimal: false,
    totalProduct: 20,
    remaining: 15,
    minStockAlert: 4,
    expiryDate: new Date(Date.now() + 540 * 24 * 60 * 60 * 1000),
    description: "Luxury South American Arabica beans roast offering an intense spicy finish.",
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },

  // =========================================================================
  // 4. DAIRY PRODUCTS (5 products)
  // =========================================================================
  {
    itemName: "Prema Full Cream Pasteurized Fresh Milk 1 Litre Bottle",
    brandName: "Prema",
    category: "Dairy Products",
    subcategory: "Fresh Milk",
    sku: "DAI-PRM-017",
    barcode: "896600200017",
    stockID: "PRM-8966017",
    costPrice: 290,
    salePrice: 340,
    rate: 340,
    unit: "Litre",
    qty: "Litre",
    allowDecimal: true,
    totalProduct: 50,
    remaining: 2, // LOW STOCK (2 < 12) & Near Expiry
    minStockAlert: 12,
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days (fresh milk)
    description: "Farm-fresh 100% pure pasteurized non-homogenized cow milk rich in cream.",
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Anhar Plain Probiotic Greek Yogurt 450g",
    brandName: "Anhar",
    category: "Dairy Products",
    subcategory: "Yogurt & Dahi",
    sku: "DAI-ANH-018",
    barcode: "896600200018",
    stockID: "ANH-8966018",
    costPrice: 280,
    salePrice: 350,
    rate: 350,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 30,
    remaining: 22,
    minStockAlert: 6,
    expiryDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks
    description: "Strained thick artisan Greek yogurt loaded with high protein and gut probiotics.",
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Adams Pure Mozzarella Shredded Cheese 400g Pouch",
    brandName: "Adams",
    category: "Dairy Products",
    subcategory: "Cheese",
    sku: "DAI-MOZ-019",
    barcode: "896600200019",
    stockID: "MOZ-8966019",
    costPrice: 780,
    salePrice: 950,
    rate: 950,
    unit: "Packet",
    qty: "Packet",
    allowDecimal: false,
    totalProduct: 40,
    remaining: 28,
    minStockAlert: 8,
    expiryDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
    description: "Pre-shredded high-stretch mozzarella cheese for homemade pizza and baked pasta.",
    image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Lurpak Danish Slightly Salted Butter 200g Block",
    brandName: "Lurpak",
    category: "Dairy Products",
    subcategory: "Butter & Spreads",
    sku: "DAI-LUR-020",
    barcode: "896600200020",
    stockID: "LUR-8966020",
    costPrice: 850,
    salePrice: 1050,
    rate: 1050,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 30,
    remaining: 18,
    minStockAlert: 5,
    expiryDate: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
    description: "Imported European churned fresh cream butter for culinary excellence.",
    image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Tarang Tea Whitener Liquid 1 Litre Carton (Pack of 12)",
    brandName: "Engro",
    category: "Dairy Products",
    subcategory: "Tea Whiteners",
    sku: "DAI-TRG-021",
    barcode: "896600200021",
    stockID: "TRG-8966021",
    costPrice: 2850,
    salePrice: 3360,
    rate: 3360,
    unit: "Carton",
    qty: "Carton",
    allowDecimal: false,
    totalProduct: 25,
    remaining: 20,
    minStockAlert: 5,
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    description: "Specialized rich dairy tea mix blend for making thick creamy traditional chai.",
    image: "https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },

  // =========================================================================
  // 5. SNACKS (6 products)
  // =========================================================================
  {
    itemName: "Kurkure Red Chilli Jhatpat Spicy Corn Puffs 50g",
    brandName: "PepsiCo",
    category: "Snacks",
    subcategory: "Corn Snacks & Puffs",
    sku: "SNK-KUR-022",
    barcode: "896600200022",
    stockID: "KUR-8966022",
    costPrice: 42,
    salePrice: 50,
    rate: 50,
    unit: "Packet",
    qty: "Packet",
    allowDecimal: false,
    totalProduct: 150,
    remaining: 120,
    minStockAlert: 25,
    expiryDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
    description: "Crunchy extruded corn spirals with fiery desi red chili seasoning.",
    image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "LU Prince Chocolate Sandwich Biscuits Family Box",
    brandName: "LU",
    category: "Snacks",
    subcategory: "Biscuits & Cookies",
    sku: "SNK-PRN-023",
    barcode: "896600200023",
    stockID: "PRN-8966023",
    costPrice: 160,
    salePrice: 200,
    rate: 200,
    unit: "Box",
    qty: "Box",
    allowDecimal: false,
    totalProduct: 70,
    remaining: 4, // LOW STOCK (4 < 12)
    minStockAlert: 12,
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    description: "Crispy embossed biscuits sandwiched with smooth rich chocolate cream.",
    image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Nestle KitKat 4-Finger Milk Chocolate Wafer Bar 41.5g",
    brandName: "Nestlé",
    category: "Snacks",
    subcategory: "Chocolates & Wafers",
    sku: "SNK-KIT-024",
    barcode: "896600200024",
    stockID: "KIT-8966024",
    costPrice: 155,
    salePrice: 190,
    rate: 190,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 100,
    remaining: 76,
    minStockAlert: 15,
    expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
    description: "Crisp wafer fingers smothered in smooth milk chocolate: Have a break, have a KitKat.",
    image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Shan Shoop Chatpatta Instant Noodles 70g",
    brandName: "Shan",
    category: "Snacks",
    subcategory: "Instant Noodles",
    sku: "SNK-SHP-025",
    barcode: "896600200025",
    stockID: "SHP-8966025",
    costPrice: 48,
    salePrice: 60,
    rate: 60,
    unit: "Packet",
    qty: "Packet",
    allowDecimal: false,
    totalProduct: 160,
    remaining: 130,
    minStockAlert: 30,
    expiryDate: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000),
    description: "Quick cooking springy wheat noodles with tangy masala broth tastemaker.",
    image: "https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Act II Butter Lovers Microwave Popcorn 85g Pack",
    brandName: "Act II",
    category: "Snacks",
    subcategory: "Popcorn",
    sku: "SNK-ACT-026",
    barcode: "896600200026",
    stockID: "ACT-8966026",
    costPrice: 140,
    salePrice: 180,
    rate: 180,
    unit: "Packet",
    qty: "Packet",
    allowDecimal: false,
    totalProduct: 50,
    remaining: 35,
    minStockAlert: 10,
    expiryDate: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000),
    description: "Ready-in-3-minutes gourmet microwave popcorn with extra theater-style butter.",
    image: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Haribo Goldbears Fruity Gummy Candy Bag 100g",
    brandName: "Haribo",
    category: "Snacks",
    subcategory: "Gummies & Candy",
    sku: "SNK-HAR-027",
    barcode: "896600200027",
    stockID: "HAR-8966027",
    costPrice: 320,
    salePrice: 420,
    rate: 420,
    unit: "Packet",
    qty: "Packet",
    allowDecimal: false,
    totalProduct: 40,
    remaining: 5, // LOW STOCK (5 < 10)
    minStockAlert: 10,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    description: "The original chewy gummy bears in 5 fruit flavors: strawberry, apple, lemon, orange, pineapple.",
    image: "https://images.unsplash.com/photo-1571216332002-282dce467b32?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },

  // =========================================================================
  // 6. PERSONAL CARE (6 products)
  // =========================================================================
  {
    itemName: "Sunsilk Co-Creations Black Shine Shampoo 360ml",
    brandName: "Unilever",
    category: "Personal Care",
    subcategory: "Hair Care",
    sku: "PER-SUN-028",
    barcode: "896600200028",
    stockID: "SUN-8966028",
    costPrice: 580,
    salePrice: 720,
    rate: 720,
    unit: "ML",
    qty: "ML",
    allowDecimal: false,
    totalProduct: 60,
    remaining: 45,
    minStockAlert: 12,
    expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
    description: "Amla pearl complex formula maintaining natural black hair luster from first wash.",
    image: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Lifebuoy Total 10 Antibacterial Soap Bar 140g",
    brandName: "Unilever",
    category: "Personal Care",
    subcategory: "Soap & Hygiene",
    sku: "PER-LFB-029",
    barcode: "896600200029",
    stockID: "LFB-8966029",
    costPrice: 110,
    salePrice: 140,
    rate: 140,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 140,
    remaining: 115,
    minStockAlert: 20,
    expiryDate: new Date(Date.now() + 1095 * 24 * 60 * 60 * 1000),
    description: "Silver shield germ protection bar fighting 10 infection-causing bacteria.",
    image: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Sensodyne Deep Clean Sensitive Toothpaste 100ml",
    brandName: "GSK",
    category: "Personal Care",
    subcategory: "Oral Care",
    sku: "PER-SEN-030",
    barcode: "896600200030",
    stockID: "SEN-8966030",
    costPrice: 380,
    salePrice: 470,
    rate: 470,
    unit: "ML",
    qty: "ML",
    allowDecimal: false,
    totalProduct: 50,
    remaining: 38,
    minStockAlert: 10,
    expiryDate: new Date(Date.now() + 540 * 24 * 60 * 60 * 1000),
    description: "Clinically proven desensitizing potassium nitrate formula providing lasting sensitivity relief.",
    image: "https://images.unsplash.com/photo-1559599101-f09722fb4948?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Lifebuoy Total Hand Sanitizer 250ml Pump Bottle",
    brandName: "Unilever",
    category: "Personal Care",
    subcategory: "Hygiene",
    sku: "PER-LHS-031",
    barcode: "896600200031",
    stockID: "LHS-8966031",
    costPrice: 320,
    salePrice: 400,
    rate: 400,
    unit: "Bottle",
    qty: "Bottle",
    allowDecimal: false,
    totalProduct: 40,
    remaining: 3, // LOW STOCK (3 < 8)
    minStockAlert: 8,
    expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
    description: "70% ethyl alcohol gel with moisturizer killing 99.9% viruses without sticky residue.",
    image: "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Nivea Soft Light Moisturizing Cream 200ml Jar",
    brandName: "Nivea",
    category: "Personal Care",
    subcategory: "Skin Care",
    sku: "PER-NIV-032",
    barcode: "896600200032",
    stockID: "NIV-8966032",
    costPrice: 850,
    salePrice: 1080,
    rate: 1080,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 35,
    remaining: 24,
    minStockAlert: 6,
    expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
    description: "Jojoba oil and Vitamin E enriched non-greasy fast absorbing face and body cream.",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Gillette Mach3 Turbo Razor Blades Cartridge (4 Pack)",
    brandName: "Gillette",
    category: "Personal Care",
    subcategory: "Shaving & Grooming",
    sku: "PER-GIL-033",
    barcode: "896600200033",
    stockID: "GIL-8966033",
    costPrice: 1450,
    salePrice: 1850,
    rate: 1850,
    unit: "Box",
    qty: "Box",
    allowDecimal: false,
    totalProduct: 25,
    remaining: 2, // LOW STOCK (2 < 5)
    minStockAlert: 5,
    expiryDate: null,
    description: "Stronger-than-steel 3-blade shaving cartridges with lubricating strip for zero irritation.",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },

  // =========================================================================
  // 7. CLEANING PRODUCTS (5 products)
  // =========================================================================
  {
    itemName: "Vim Lemon Dishwash Gel Bottle 500ml",
    brandName: "Unilever",
    category: "Cleaning Products",
    subcategory: "Dishwashing",
    sku: "CLN-VIM-034",
    barcode: "896600200034",
    stockID: "VIM-8966034",
    costPrice: 280,
    salePrice: 350,
    rate: 350,
    unit: "ML",
    qty: "ML",
    allowDecimal: false,
    totalProduct: 70,
    remaining: 52,
    minStockAlert: 12,
    expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
    description: "Power of 100 lemons concentrated dishwashing liquid that leaves no white residue on plates.",
    image: "https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Ariel Complete Detergent Washing Powder 2kg Bag",
    brandName: "P&G",
    category: "Cleaning Products",
    subcategory: "Laundry Care",
    sku: "CLN-ARL-035",
    barcode: "896600200035",
    stockID: "ARL-8966035",
    costPrice: 980,
    salePrice: 1190,
    rate: 1190,
    unit: "Bag",
    qty: "Bag",
    allowDecimal: false,
    totalProduct: 60,
    remaining: 48,
    minStockAlert: 10,
    expiryDate: new Date(Date.now() + 1095 * 24 * 60 * 60 * 1000),
    description: "Deep clean enzymatic formula for semi-automatic and front-load washing machines.",
    image: "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Finis Black Phenyl Disinfectant Floor Cleaner 1 Litre",
    brandName: "Finis",
    category: "Cleaning Products",
    subcategory: "Floor & Drain Cleaners",
    sku: "CLN-FNS-036",
    barcode: "896600200036",
    stockID: "FNS-8966036",
    costPrice: 220,
    salePrice: 290,
    rate: 290,
    unit: "Litre",
    qty: "Litre",
    allowDecimal: false,
    totalProduct: 50,
    remaining: 35,
    minStockAlert: 10,
    expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
    description: "Heavy coal tar black phenyl solution repelling insects and sanitizing hospital and store floors.",
    image: "https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Robin Blue Liquid Fabric Brightener 100ml Bottle",
    brandName: "Reckitt",
    category: "Cleaning Products",
    subcategory: "Fabric Care",
    sku: "CLN-RBN-037",
    barcode: "896600200037",
    stockID: "RBN-8966037",
    costPrice: 90,
    salePrice: 120,
    rate: 120,
    unit: "Bottle",
    qty: "Bottle",
    allowDecimal: false,
    totalProduct: 80,
    remaining: 4, // LOW STOCK (4 < 15)
    minStockAlert: 15,
    expiryDate: new Date(Date.now() + 1095 * 24 * 60 * 60 * 1000),
    description: "Ultramarine liquid blue whitener restoring dazzling white brilliance to cotton shirts and uniforms.",
    image: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Colin Glass and Surface Cleaner Trigger Spray 500ml",
    brandName: "Reckitt",
    category: "Cleaning Products",
    subcategory: "Glass & Multipurpose",
    sku: "CLN-CLN-038",
    barcode: "896600200038",
    stockID: "CLN-8966038",
    costPrice: 340,
    salePrice: 430,
    rate: 430,
    unit: "Bottle",
    qty: "Bottle",
    allowDecimal: false,
    totalProduct: 45,
    remaining: 32,
    minStockAlert: 8,
    expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
    description: "Streak-free shine spray for mirrors, windshields, glass display counters and computer screens.",
    image: "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },

  // =========================================================================
  // 8. HARDWARE (6 products)
  // =========================================================================
  {
    itemName: "Stanley FatMax Curved Claw Hammer 20oz Steel",
    brandName: "Stanley",
    category: "Hardware",
    subcategory: "Hand Tools",
    sku: "HDW-STN-039",
    barcode: "896600200039",
    stockID: "STN-8966039",
    costPrice: 1850,
    salePrice: 2450,
    rate: 2450,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 20,
    remaining: 15,
    minStockAlert: 4,
    expiryDate: null,
    description: "AntiVibe all-steel one-piece forged claw hammer reducing vibration shock to arm joints.",
    image: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Crown Professional Screwdriver Set 8-Piece Box",
    brandName: "Crown",
    category: "Hardware",
    subcategory: "Screwdrivers & Bits",
    sku: "HDW-CRW-040",
    barcode: "896600200040",
    stockID: "CRW-8966040",
    costPrice: 1450,
    salePrice: 1950,
    rate: 1950,
    unit: "Box",
    qty: "Box",
    allowDecimal: false,
    totalProduct: 25,
    remaining: 18,
    minStockAlert: 5,
    expiryDate: null,
    description: "S2 industrial tool alloy steel precision screwdrivers with rubber anti-slip hex handles.",
    image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Garden PVC Reinforced Water Hose Pipe 1/2-Inch (Per Meter)",
    brandName: "Popular Pipes",
    category: "Hardware",
    subcategory: "Hoses & Plumbing",
    sku: "HDW-HOS-041",
    barcode: "896600200041",
    stockID: "HOS-8966041",
    costPrice: 95,
    salePrice: 135,
    rate: 135,
    unit: "Meter",
    qty: "Meter",
    allowDecimal: true,
    totalProduct: 150,
    remaining: 65.5, // Decimal stock
    minStockAlert: 20,
    expiryDate: null,
    description: "3-layer braided PVC flexible water hose with anti-kink polyester yarn reinforcement.",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Yale Heavy Duty Hardened Steel Brass Padlock 60mm",
    brandName: "Yale",
    category: "Hardware",
    subcategory: "Locks & Security",
    sku: "HDW-YLE-042",
    barcode: "896600200042",
    stockID: "YLE-8966042",
    costPrice: 1650,
    salePrice: 2200,
    rate: 2200,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 25,
    remaining: 3, // LOW STOCK (3 < 6)
    minStockAlert: 6,
    expiryDate: null,
    description: "High-security anti-cut boron steel shackle padlock with double ball locking mechanism.",
    image: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Taj Measuring Tape 50 Feet Steel Blade (Per Feet)",
    brandName: "Taj Tools",
    category: "Hardware",
    subcategory: "Measuring Tools",
    sku: "HDW-TAJ-043",
    barcode: "896600200043",
    stockID: "TAJ-8966043",
    costPrice: 420,
    salePrice: 580,
    rate: 580,
    unit: "Feet",
    qty: "Feet",
    allowDecimal: true,
    totalProduct: 100,
    remaining: 120.5, // Decimal feet stock
    minStockAlert: 15,
    expiryDate: null,
    description: "Impact-absorbing rubber-cased architectural measuring tape calibrated in feet and inches.",
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Tolsen Heavy Duty 10-Inch Adjustable Pipe Wrench",
    brandName: "Tolsen",
    category: "Hardware",
    subcategory: "Plumbing Tools",
    sku: "HDW-TLS-044",
    barcode: "896600200044",
    stockID: "TLS-8966044",
    costPrice: 1100,
    salePrice: 1550,
    rate: 1550,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 20,
    remaining: 14,
    minStockAlert: 4,
    expiryDate: null,
    description: "Cast iron handle with induction-hardened serrated hook jaws for gripping galvanized pipes.",
    image: "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },

  // =========================================================================
  // 9. PAINT (6 products with specialized paint attributes)
  // =========================================================================
  {
    itemName: "Master Super Synthetic High Gloss Enamel 1 Gallon",
    brandName: "Master Paints",
    category: "Paint",
    subcategory: "Synthetic Enamel",
    sku: "PNT-MST-045",
    barcode: "896600200045",
    stockID: "MST-8966045",
    costPrice: 3950,
    salePrice: 5100,
    rate: 5100,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 24,
    remaining: 18,
    minStockAlert: 5,
    expiryDate: null,
    description: "Premium oil-based mirror gloss enamel with outstanding weather resistance for gates and doors.",
    image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=400&q=80",
    isPaint: true,
    paintType: "Synthetic Enamel",
    colourName: "Snow White Gloss",
    colorCode: "MP-101",
    shadeNumber: "SH-1011",
    paintSize: "1 Gallon (3.78L)",
    finish: "High Gloss",
    customColorInfo: "Tint Base 1 Architectural Finish"
  },
  {
    itemName: "Berger WeatherCoat Ultra Exterior Wall Emulsion 4 Litres",
    brandName: "Berger",
    category: "Paint",
    subcategory: "Exterior Emulsion",
    sku: "PNT-BRG-046",
    barcode: "896600200046",
    stockID: "BRG-8966046",
    costPrice: 4800,
    salePrice: 6200,
    rate: 6200,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 20,
    remaining: 14,
    minStockAlert: 4,
    expiryDate: null,
    description: "Silicone-modified water-repellent exterior facade paint fighting algae, fungus and efflorescence.",
    image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80",
    isPaint: true,
    paintType: "WeatherCoat Exterior",
    colourName: "WeatherCoat Sandy Beige",
    colorCode: "BP-602",
    shadeNumber: "SH-6028",
    paintSize: "4 Litres",
    finish: "Matt Flat",
    customColorInfo: "UV-Resistant Exterior Grade Tint"
  },
  {
    itemName: "Dulux Velvet Touch Pearl Glo Interior Luxury Emulsion 1 Gallon",
    brandName: "Dulux",
    category: "Paint",
    subcategory: "Luxury Interior Emulsion",
    sku: "PNT-DLX-047",
    barcode: "896600200047",
    stockID: "DLX-8966047",
    costPrice: 4200,
    salePrice: 5400,
    rate: 5400,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 18,
    remaining: 2, // LOW STOCK (2 < 4)
    minStockAlert: 4,
    expiryDate: null,
    description: "Rich luminescent micro-pearl formulation creating a subtle silky glow on drawing room walls.",
    image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80",
    isPaint: true,
    paintType: "Luxury Interior Emulsion",
    colourName: "Pearl Glo Mint Frost",
    colorCode: "DL-405",
    shadeNumber: "SH-4052",
    paintSize: "1 Gallon (3.78L)",
    finish: "Pearl Sheen",
    customColorInfo: "Pastel Interior Tint Formulation"
  },
  {
    itemName: "Brighto All-Purpose Plastic Emulsion Quarter 0.91L",
    brandName: "Brighto",
    category: "Paint",
    subcategory: "Plastic Emulsion",
    sku: "PNT-BRT-048",
    barcode: "896600200048",
    stockID: "BRT-8966048",
    costPrice: 1150,
    salePrice: 1490,
    rate: 1490,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 30,
    remaining: 22,
    minStockAlert: 6,
    expiryDate: null,
    description: "Washable water-thinned acrylic plastic emulsion for bedroom walls and ceilings.",
    image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&q=80",
    isPaint: true,
    paintType: "Plastic Emulsion",
    colourName: "Rose Petal Pink",
    colorCode: "BR-208",
    shadeNumber: "SH-2084",
    paintSize: "Quarter (0.91L)",
    finish: "Smooth Silk",
    customColorInfo: "Water-based latex interior formula"
  },
  {
    itemName: "Jotun Fenomastic Pure Colours Interior Matt 1 Gallon",
    brandName: "Jotun",
    category: "Paint",
    subcategory: "Designer Matt Emulsion",
    sku: "PNT-JOT-049",
    barcode: "896600200049",
    stockID: "JOT-8966049",
    costPrice: 5100,
    salePrice: 6500,
    rate: 6500,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 15,
    remaining: 11,
    minStockAlert: 3,
    expiryDate: null,
    description: "Nordic ultra-matte luxury paint with exceptional color accuracy and wipeable durability.",
    image: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=400&q=80",
    isPaint: true,
    paintType: "Designer Matt Emulsion",
    colourName: "Nordic Charcoal Gray",
    colorCode: "JT-904",
    shadeNumber: "SH-9041",
    paintSize: "1 Gallon (3.78L)",
    finish: "Velvet Matt",
    customColorInfo: "Deep Scandinavian pigment mixture"
  },
  {
    itemName: "Diamond Polyurethane Clear Wood Lacquer & Varnish 1 Litre",
    brandName: "Diamond Paints",
    category: "Paint",
    subcategory: "Wood Stains & Coatings",
    sku: "PNT-DMD-050",
    barcode: "896600200050",
    stockID: "DMD-8966050",
    costPrice: 980,
    salePrice: 1320,
    rate: 1320,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 20,
    remaining: 3, // LOW STOCK (3 < 5)
    minStockAlert: 5,
    expiryDate: null,
    description: "Scratch-resistant single pack moisture-cure polyurethane varnish for hardwood flooring and doors.",
    image: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=400&q=80",
    isPaint: true,
    paintType: "Wood Lacquer Varnish",
    colourName: "Natural Antique Teak",
    colorCode: "DM-105",
    shadeNumber: "SH-1055",
    paintSize: "1 Litre",
    finish: "Clear Satin",
    customColorInfo: "High-solid clear protective topcoat"
  },

  // =========================================================================
  // 10. ELECTRICAL ITEMS (5 products)
  // =========================================================================
  {
    itemName: "Pakistan Cables 7/29 Twin Core Flat Copper Wire (Per Meter)",
    brandName: "Pakistan Cables",
    category: "Electrical Items",
    subcategory: "Cables & Wiring",
    sku: "ELE-PKC-051",
    barcode: "896600200051",
    stockID: "PKC-8966051",
    costPrice: 210,
    salePrice: 275,
    rate: 275,
    unit: "Meter",
    qty: "Meter",
    allowDecimal: true,
    totalProduct: 200,
    remaining: 95.5, // Decimal stock
    minStockAlert: 25,
    expiryDate: null,
    description: "Certified grade 1 pure copper strands insulated with dual-layer heavy duty PVC.",
    image: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "EcoStar 18W T8 LED Glass Tube Light 4 Feet Cool White",
    brandName: "EcoStar",
    category: "Electrical Items",
    subcategory: "LED Lighting",
    sku: "ELE-ECS-052",
    barcode: "896600200052",
    stockID: "ECS-8966052",
    costPrice: 550,
    salePrice: 750,
    rate: 750,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 50,
    remaining: 36,
    minStockAlert: 10,
    expiryDate: null,
    description: "A-class energy efficient 1800 lumen LED retrofit batten tube with uniform light diffusion.",
    image: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Terasaki Double Pole Circuit Breaker (DP MCB) 32A",
    brandName: "Terasaki",
    category: "Electrical Items",
    subcategory: "Circuit Protection",
    sku: "ELE-TER-053",
    barcode: "896600200053",
    stockID: "TER-8966053",
    costPrice: 1350,
    salePrice: 1850,
    rate: 1850,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 25,
    remaining: 2, // LOW STOCK (2 < 6)
    minStockAlert: 6,
    expiryDate: null,
    description: "Japanese engineering 6kA breaking capacity DIN rail double pole main isolator breaker.",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Opal 4-Gang Universal Power Strip Extension Board 5M",
    brandName: "Opal",
    category: "Electrical Items",
    subcategory: "Extensions & Strips",
    sku: "ELE-OPL-054",
    barcode: "896600200054",
    stockID: "OPL-8966054",
    costPrice: 850,
    salePrice: 1190,
    rate: 1190,
    unit: "Box",
    qty: "Box",
    allowDecimal: false,
    totalProduct: 30,
    remaining: 22,
    minStockAlert: 6,
    expiryDate: null,
    description: "Fireproof PC shell extension strip with child safety shutters and 5-meter heavy duty cord.",
    image: "https://images.unsplash.com/photo-1544717302-de2939b7ef71?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "EcoStar 12W Pin Base LED Bulb Daylight B22",
    brandName: "EcoStar",
    category: "Electrical Items",
    subcategory: "LED Bulbs",
    sku: "ELE-BLB-055",
    barcode: "896600200055",
    stockID: "BLB-8966055",
    costPrice: 290,
    salePrice: 390,
    rate: 390,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 80,
    remaining: 62,
    minStockAlert: 15,
    expiryDate: null,
    description: "High power factor 85% energy saving 6500K bright white B22 bayonet cap LED bulb.",
    image: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },

  // =========================================================================
  // 11. HOUSEHOLD PRODUCTS (5 products)
  // =========================================================================
  {
    itemName: "Rose Petal Luxury Facial Tissue Box 150 Sheets",
    brandName: "Rose Petal",
    category: "Household Products",
    subcategory: "Paper Products",
    sku: "HSH-RPT-056",
    barcode: "896600200056",
    stockID: "RPT-8966056",
    costPrice: 175,
    salePrice: 220,
    rate: 220,
    unit: "Box",
    qty: "Box",
    allowDecimal: false,
    totalProduct: 100,
    remaining: 82,
    minStockAlert: 20,
    expiryDate: null,
    description: "Ultra-soft 2-ply virgin wood pulp facial wipes in elegant floral cardboard dispenser.",
    image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Air Wick Automatic Room Air Freshener Spray Refill 250ml",
    brandName: "Air Wick",
    category: "Household Products",
    subcategory: "Air Care & Fresheners",
    sku: "HSH-ARW-057",
    barcode: "896600200057",
    stockID: "ARW-8966057",
    costPrice: 650,
    salePrice: 820,
    rate: 820,
    unit: "Bottle",
    qty: "Bottle",
    allowDecimal: false,
    totalProduct: 40,
    remaining: 3, // LOW STOCK (3 < 8)
    minStockAlert: 8,
    expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
    description: "Lavender & Chamomile continuous fragrance aerosol aerosol refill lasting up to 70 days.",
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Diamond Heavy Duty Aluminum Kitchen Foil 25 Sq. Feet (Per Feet)",
    brandName: "Diamond Foil",
    category: "Household Products",
    subcategory: "Kitchen Wraps",
    sku: "HSH-ALF-058",
    barcode: "896600200058",
    stockID: "ALF-8966058",
    costPrice: 380,
    salePrice: 490,
    rate: 490,
    unit: "Feet",
    qty: "Feet",
    allowDecimal: true,
    totalProduct: 60,
    remaining: 85.5, // Decimal feet stock
    minStockAlert: 12,
    expiryDate: null,
    description: "Thick tear-resistant embossed aluminum food packaging foil for roasting, baking and grilling.",
    image: "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Scotch-Brite Cotton Strip Floor Mop with Telescopic Handle",
    brandName: "3M Scotch-Brite",
    category: "Household Products",
    subcategory: "Cleaning Accessories",
    sku: "HSH-3MB-059",
    barcode: "896600200059",
    stockID: "3MB-8966059",
    costPrice: 850,
    salePrice: 1150,
    rate: 1150,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 25,
    remaining: 18,
    minStockAlert: 5,
    expiryDate: null,
    description: "Super-absorbent microfiber and cotton blended strand mop for tile and marble cleaning.",
    image: "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  },
  {
    itemName: "Prestige Stainless Steel Vacuum Thermos Flask 1 Litre",
    brandName: "Prestige",
    category: "Household Products",
    subcategory: "Drinkware & Thermos",
    sku: "HSH-PRS-060",
    barcode: "896600200060",
    stockID: "PRS-8966060",
    costPrice: 1850,
    salePrice: 2450,
    rate: 2450,
    unit: "Piece",
    qty: "Piece",
    allowDecimal: false,
    totalProduct: 20,
    remaining: 4, // LOW STOCK (4 < 6)
    minStockAlert: 6,
    expiryDate: null,
    description: "Double-walled vacuum insulated SUS304 stainless steel thermal flask keeping liquids hot for 24h.",
    image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=400&q=80",
    isPaint: false
  }
];

export async function replaceWith60Products() {
  console.log("================================================================================");
  console.log("  REPLACING OLD TEST DATA WITH EXACTLY 60 NEW DIVERSE REALISTIC PRODUCTS");
  console.log("================================================================================\n");

  await mongoose.connect(MONGO_URI);
  console.log("✅ MongoDB Connected Successfully to:", MONGO_URI);

  const dbName = mongoose.connection.name;
  console.log(`🔍 Verified Database Name: "${dbName}"`);

  if (dbName !== "pos") {
    throw new Error(`SAFETY CHECK FAILED: Expected dev database 'pos', but connected to '${dbName}'! Aborting.`);
  }

  // STEP 1: Identify and Remove Old Testing Products (Barcodes 896500100001 - 896500100040)
  console.log("\n--- STEP 1: Safely Removing Old Testing Products ---");
  const oldTestBarcodesRegex = /^89650010/;
  const oldTestProducts = await Product.find({ barcode: { $regex: oldTestBarcodesRegex } }).lean();
  console.log(`🔍 Found ${oldTestProducts.length} previous test products to remove.`);

  if (oldTestProducts.length > 0) {
    const oldProductIds = oldTestProducts.map(p => p._id);
    const deleteBatchResult = await ProductBatch.deleteMany({ productId: { $in: oldProductIds } });
    const deleteProductResult = await Product.deleteMany({ _id: { $in: oldProductIds } });
    console.log(`  🗑️ Successfully deleted ${deleteProductResult.deletedCount} old test products and ${deleteBatchResult.deletedCount} associated batches.`);
  } else {
    console.log("  ℹ️ No previous test products found to remove.");
  }

  // Verify that Original Products were NOT touched
  const remainingProductsCount = await Product.countDocuments();
  console.log(`🛡️ Original Products Preserved in Catalog: ${remainingProductsCount}`);

  // STEP 2: Synchronize Categories
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
    "Electrical Items",
    "Household Products"
  ];

  console.log("\n--- STEP 2: Synchronizing Categories ---");
  for (const catName of categoriesList) {
    const exists = await Category.findOne({ name: catName });
    if (!exists) {
      await Category.create({ name: catName, isActive: true });
      console.log(`  + Created Category: "${catName}"`);
    } else {
      console.log(`  ✓ Category exists: "${catName}"`);
    }
  }

  // STEP 3: Synchronize Brands
  const brandsList = [
    "Bake Parlor", "Sufi", "National", "Mehran", "Mitchell's", "Al-Barakah",
    "Al-Khair", "Al-Fateh", "Northern Valley", "Coca-Cola", "Nestlé", "Shezan",
    "Tapal", "Pakola", "Davidoff", "Prema", "Anhar", "Adams", "Lurpak",
    "Engro", "PepsiCo", "LU", "Shan", "Act II", "Haribo", "Unilever",
    "GSK", "Nivea", "Gillette", "P&G", "Finis", "Reckitt", "Stanley",
    "Crown", "Popular Pipes", "Yale", "Taj Tools", "Tolsen", "Master Paints",
    "Berger", "Dulux", "Brighto", "Jotun", "Diamond Paints", "Pakistan Cables",
    "EcoStar", "Terasaki", "Opal", "Rose Petal", "Air Wick", "Diamond Foil",
    "3M Scotch-Brite", "Prestige"
  ];

  console.log("\n--- STEP 3: Synchronizing Brands ---");
  for (const bName of brandsList) {
    const exists = await Brand.findOne({ name: bName });
    if (!exists) {
      await Brand.create({ name: bName, isActive: true });
      console.log(`  + Created Brand: "${bName}"`);
    }
  }
  console.log(`  ✓ All ${brandsList.length} required brands verified.`);

  // STEP 4: Insert 60 New Products
  console.log("\n--- STEP 4: Inserting Exactly 60 New Diverse Products ---");
  let insertedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < new60ProductsData.length; i++) {
    const pData = new60ProductsData[i];
    const indexNum = i + 1;

    let existing = await Product.findOne({
      $or: [
        { barcode: pData.barcode },
        { sku: pData.sku },
        { stockID: pData.stockID }
      ]
    });

    if (existing) {
      Object.assign(existing, pData);
      existing.brand = pData.brandName;
      await existing.save();
      updatedCount++;
      console.log(`  [${String(indexNum).padStart(2, "0")}/60] 🔄 Updated: "${existing.itemName}" (${existing.sku})`);
    } else {
      const newProd = await Product.create({
        ...pData,
        brand: pData.brandName
      });
      existing = newProd;
      insertedCount++;
      console.log(`  [${String(indexNum).padStart(2, "0")}/60] ➕ Inserted: "${newProd.itemName}" (${newProd.sku})`);
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
        notes: `Seed lot batch for ${existing.itemName}`
      });
    } else {
      batch.quantityRemaining = pData.remaining;
      batch.costPrice = pData.costPrice;
      batch.salePrice = pData.salePrice;
      batch.expiryDate = pData.expiryDate;
      await batch.save();
    }
  }

  console.log(`\n✅ Seeding Complete: ${insertedCount} newly inserted, ${updatedCount} updated.`);

  // STEP 5: Verification
  console.log("\n--- STEP 5: Database Consistency & Attribute Verification ---");
  const seededBarcodes = new60ProductsData.map(p => p.barcode);
  const foundNewProducts = await Product.find({ barcode: { $in: seededBarcodes } }).lean();
  console.log(`📦 Seeded 60 Products in Database: ${foundNewProducts.length} of ${new60ProductsData.length}`);

  if (foundNewProducts.length !== 60) {
    throw new Error(`Expected exactly 60 new products, found ${foundNewProducts.length}!`);
  }

  // Total products in catalog
  const totalInDb = await Product.countDocuments();
  console.log(`📦 Total Products in Store Catalog: ${totalInDb} (11 Original + 60 New = 71)`);

  // Category distribution
  const catDist = {};
  for (const p of foundNewProducts) {
    catDist[p.category] = (catDist[p.category] || 0) + 1;
  }
  console.log("\n📊 Category Distribution:");
  for (const [cat, cnt] of Object.entries(catDist)) {
    console.log(`   • ${cat.padEnd(22)}: ${cnt} products`);
  }

  // Units representation
  const unitsFound = [...new Set(foundNewProducts.map(p => p.unit))];
  console.log(`\n📏 Units of Measurement Represented (${unitsFound.length}): ${unitsFound.join(", ")}`);

  // Low stock products
  const lowStockProds = foundNewProducts.filter(p => p.remaining <= p.minStockAlert);
  console.log(`\n⚠️ Low Stock Alert Items: ${lowStockProds.length} products`);
  lowStockProds.forEach(p => console.log(`   • ${p.itemName} (Stock: ${p.remaining} ${p.unit}, Alert: ${p.minStockAlert})`));

  // Decimal quantity products
  const decimalProds = foundNewProducts.filter(p => p.allowDecimal || p.remaining % 1 !== 0);
  console.log(`\n⚖️ Decimal Quantity Items: ${decimalProds.length} products`);
  decimalProds.forEach(p => console.log(`   • ${p.itemName}: ${p.remaining} ${p.unit}`));

  // Paint specialty products
  const paintProds = foundNewProducts.filter(p => p.isPaint);
  console.log(`\n🎨 Paint Specialty Products: ${paintProds.length} products`);
  paintProds.forEach(p => console.log(`   • ${p.itemName} [${p.colorCode} - ${p.finish} - ${p.paintSize}]`));

  console.log("\n================================================================================");
  console.log("  SUCCESS! 60 NEW TEST PRODUCTS READY IN DATABASE");
  console.log("================================================================================\n");

  await mongoose.disconnect();
}

if (process.argv[1] && process.argv[1].includes("replace_test_products_60")) {
  replaceWith60Products().catch(err => {
    console.error("❌ Execution Error:", err);
    process.exit(1);
  });
}

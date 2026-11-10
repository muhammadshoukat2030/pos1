import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  // Universal Mart & ERP Fields
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  barcode: {
    type: String,
    trim: true
  },
  sku: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    default: "General",
    trim: true
  },
  brandName: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    default: "/images/product-placeholder.svg"
  },
  unit: {
    type: String,
    default: "pcs",
    trim: true
  },
  qty: {
    type: String, // preserved for legacy compatibility
    trim: true
  },
  allowDecimal: {
    type: Boolean,
    default: false
  },
  costPrice: {
    type: Number,
    default: 0
  },
  salePrice: {
    type: Number,
    default: 0
  },
  wholesalePrice: {
    type: Number,
    default: 0
  },
  minSellingPrice: {
    type: Number,
    default: 0
  },
  taxRate: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    default: ""
  },
  packagingUnits: [{
    unitName: { type: String, required: true },
    conversionFactor: { type: Number, required: true, default: 1 },
    barcode: { type: String, trim: true },
    salePrice: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 }
  }],
  rate: {
    type: Number,
    required: true
  },
  discountPercent: {
    type: Number,
    default: 0
  },
  totalProduct: {
    type: Number,
    required: true,
    default: 0
  },
  remaining: {
    type: Number,
    default: 0
  },
  minStockAlert: {
    type: Number,
    default: 5
  },
  expiryDate: {
    type: Date,
    default: null
  },
  stockID: {
    type: String,
    required: true,
    unique: true
  },
  colourName: {
    type: String,
    trim: true
  },
  refundQuantity: {
    type: Number,
    default: 0
  },
  refundStatus: {
    type: String,
    default: "none"
  }
}, { timestamps: true });

// Pre-save hook to synchronize rate & salePrice, and brandName & brand
productSchema.pre("save", function (next) {
  if (!this.salePrice && this.rate) {
    this.salePrice = this.rate;
  }
  if (!this.rate && this.salePrice) {
    this.rate = this.salePrice;
  }
  if (this.brandName && !this.brand) {
    this.brand = this.brandName;
  }
  if (this.brand && !this.brandName) {
    this.brandName = this.brand;
  }
  if (!this.barcode && this.stockID) {
    this.barcode = this.stockID;
  }
  if (!this.sku && this.stockID) {
    this.sku = this.stockID;
  }
  next();
});

// Database Performance Indexes
productSchema.index({ barcode: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ "packagingUnits.barcode": 1 });
productSchema.index({ category: 1 });
productSchema.index({ itemName: "text", brandName: "text" });
productSchema.index({ createdAt: -1 });

export default mongoose.model("Product", productSchema);

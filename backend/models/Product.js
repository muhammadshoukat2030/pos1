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
  subcategory: {
    type: String,
    trim: true,
    default: ""
  },
  brandName: {
    type: String,
    trim: true,
    index: true
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
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    default: null,
    index: true
  },
  supplierName: {
    type: String,
    trim: true,
    default: "",
    index: true
  },
  lastPurchaseDate: {
    type: Date,
    default: null
  },
  lastPurchasePrice: {
    type: Number,
    default: 0
  },
  lastInvoiceNumber: {
    type: String,
    trim: true,
    default: ""
  },
  // Paint Specialty Attributes
  isPaint: {
    type: Boolean,
    default: false,
    index: true
  },
  paintType: {
    type: String,
    trim: true,
    default: ""
  },
  colorCode: {
    type: String,
    trim: true,
    default: ""
  },
  shadeNumber: {
    type: String,
    trim: true,
    default: ""
  },
  paintSize: {
    type: String,
    trim: true,
    default: ""
  },
  finish: {
    type: String,
    trim: true,
    default: ""
  },
  customColorInfo: {
    type: String,
    trim: true,
    default: ""
  },
  colorHex: {
    type: String,
    trim: true,
    default: ""
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

// Virtual for availableStock (aliases remaining)
productSchema.virtual("availableStock").get(function () {
  return this.remaining !== undefined ? this.remaining : (this.totalProduct || 0);
});
productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

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

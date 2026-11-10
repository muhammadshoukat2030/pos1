import mongoose from "mongoose";

const storeSettingsSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      default: "Universal POS & Mart",
      required: true,
      trim: true
    },
    tagline: {
      type: String,
      default: "Smart ERP & Super Mart Solution",
      trim: true
    },
    businessType: {
      type: String,
      default: "Super Mart & Grocery",
      trim: true
    },
    logoUrl: {
      type: String,
      default: "/images/pos-logo.svg"
    },
    address: {
      type: String,
      default: "Main Commercial Market, Sector G, Suite #12",
      trim: true
    },
    phone: {
      type: String,
      default: "0319-9303154 / 0335-8004900",
      trim: true
    },
    currency: {
      type: String,
      default: "PKR",
      trim: true
    },
    currencySymbol: {
      type: String,
      default: "Rs.",
      trim: true
    },
    timezone: {
      type: String,
      default: "Asia/Karachi",
      trim: true
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    receiptFooter: {
      type: String,
      default: "Thank You! Visit Again",
      trim: true
    },
    urduFooterNotice: {
      type: String,
      default: "بل کے بغیر مال تبدیل یا واپس نہیں ہوگا - خریداری کا شکریہ",
      trim: true
    },
    receiptHeaderNotice: {
      type: String,
      default: "Customer Copy / Official Receipt",
      trim: true
    },
    receiptShowBarcode: {
      type: Boolean,
      default: true
    },
    receiptShowTax: {
      type: Boolean,
      default: true
    },
    receiptShowDiscounts: {
      type: Boolean,
      default: true
    },
    receiptWidth: {
      type: String,
      enum: ["80mm", "58mm"],
      default: "80mm"
    },
    defaultPosMode: {
      type: String,
      enum: ["hybrid", "grid", "barcode"],
      default: "hybrid"
    },
    activeTheme: {
      type: String,
      enum: ["bizcare-teal", "eproduct-blue", "ixershop-navy", "slate-dark"],
      default: "bizcare-teal"
    },
    backupSettings: {
      autoBackupEnabled: { type: Boolean, default: false },
      backupFrequency: { type: String, enum: ["daily", "weekly", "monthly"], default: "daily" },
      lastBackupDate: { type: Date, default: null },
      retentionDays: { type: Number, default: 30 }
    }
  },
  { timestamps: true }
);

// Helper to retrieve the single active settings or create default
storeSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const StoreSettings = mongoose.model("StoreSettings", storeSettingsSchema);
export default StoreSettings;

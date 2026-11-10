import mongoose from "mongoose";

const purchaseItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  barcode: {
    type: String,
    trim: true,
    default: ""
  },
  sku: {
    type: String,
    trim: true,
    default: ""
  },
  unit: {
    type: String,
    default: "pcs",
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  purchasePrice: {
    type: Number,
    required: true,
    min: 0
  },
  sellingPrice: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    required: true
  },
  expiryDate: {
    type: Date,
    default: null
  },
  batchNumber: {
    type: String,
    trim: true,
    default: ""
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProductBatch",
    default: null
  }
});

const purchasePaymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    default: "Cash",
    trim: true
  },
  referenceNumber: {
    type: String,
    trim: true,
    default: ""
  },
  notes: {
    type: String,
    trim: true,
    default: ""
  },
  recordedBy: {
    type: String,
    default: "Admin"
  }
});

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    invoiceNumber: {
      type: String,
      trim: true,
      default: ""
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
      default: ""
    },
    supplierPhone: {
      type: String,
      trim: true,
      default: ""
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    items: [purchaseItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    balanceDue: {
      type: Number,
      default: 0,
      min: 0
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Partially Paid", "Unpaid"],
      default: "Paid",
      index: true
    },
    paymentMethod: {
      type: String,
      default: "Cash"
    },
    payments: [purchasePaymentSchema],
    notes: {
      type: String,
      default: ""
    },
    recordedBy: {
      type: String,
      default: "Admin"
    }
  },
  { timestamps: true }
);

purchaseSchema.index({ purchaseDate: -1 });
purchaseSchema.index({ supplierId: 1, purchaseDate: -1 });
purchaseSchema.index({ "items.productId": 1 });
purchaseSchema.index({ invoiceNumber: 1 });

const Purchase = mongoose.model("Purchase", purchaseSchema);
export default Purchase;

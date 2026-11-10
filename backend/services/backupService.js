import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Models for backup snapshot
import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import PrintSale from "../models/PrintSale.js";
import Customer from "../models/Customer.js";
import Supplier from "../models/Supplier.js";
import Branch from "../models/Branch.js";
import LocationStock from "../models/LocationStock.js";
import ProductBatch from "../models/ProductBatch.js";
import StoreSettings from "../models/StoreSettings.js";
import StockAudit from "../models/StockAudit.js";
import LedgerTransaction from "../models/LedgerTransaction.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.resolve(__dirname, "../backups");

// Ensure backups directory exists
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

export const backupService = {
  /**
   * Create an on-demand or automated JSON snapshot backup
   */
  async createBackup(initiatedBy = "Admin") {
    const timestamp = Date.now();
    const dateStr = new Date(timestamp).toISOString().replace(/[:.]/g, "-");
    const filename = `backup-${dateStr}.json`;
    const filePath = path.join(BACKUPS_DIR, filename);

    // Fetch all collection data in parallel
    const [
      products,
      sales,
      bills,
      customers,
      suppliers,
      branches,
      locationStocks,
      batches,
      settings,
      stockAudits,
      ledgerEntries
    ] = await Promise.all([
      Product.find().lean(),
      Sale.find().lean(),
      PrintSale.find().lean(),
      Customer.find().lean(),
      Supplier.find().lean(),
      Branch.find().lean(),
      LocationStock.find().lean(),
      ProductBatch.find().lean(),
      StoreSettings.find().lean(),
      StockAudit.find().lean(),
      LedgerTransaction.find().lean()
    ]);

    const collections = {
      Product: products,
      Sale: sales,
      PrintSale: bills,
      Customer: customers,
      Supplier: suppliers,
      Branch: branches,
      LocationStock: locationStocks,
      ProductBatch: batches,
      StoreSettings: settings,
      StockAudit: stockAudits,
      LedgerTransaction: ledgerEntries
    };

    let totalRecords = 0;
    const summary = {};
    for (const [colName, docs] of Object.entries(collections)) {
      summary[colName] = docs.length;
      totalRecords += docs.length;
    }

    const payload = {
      metadata: {
        version: "2.0.0",
        appName: "Universal Retail POS & ERP",
        createdAt: new Date(timestamp).toISOString(),
        timestamp,
        initiatedBy,
        collectionsCount: Object.keys(collections).length,
        totalRecords,
        summary
      },
      collections
    };

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
    const stats = fs.statSync(filePath);

    // Update lastBackupDate in StoreSettings
    await StoreSettings.updateOne({}, { $set: { "backupSettings.lastBackupDate": new Date(timestamp) } });

    return {
      filename,
      sizeBytes: stats.size,
      sizeFormatted: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
      totalRecords,
      createdAt: payload.metadata.createdAt,
      summary
    };
  },

  /**
   * List all available backup snapshots
   */
  async listBackups() {
    if (!fs.existsSync(BACKUPS_DIR)) return [];

    const files = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith(".json"));
    const backups = [];

    for (const f of files) {
      try {
        const filePath = path.join(BACKUPS_DIR, f);
        const stats = fs.statSync(filePath);

        // Read metadata header only (first 2KB)
        const fd = fs.openSync(filePath, "r");
        const buffer = Buffer.alloc(2048);
        fs.readSync(fd, buffer, 0, 2048, 0);
        fs.closeSync(fd);

        const content = buffer.toString("utf8");
        let meta = null;
        try {
          const parsed = JSON.parse(content.slice(0, content.lastIndexOf("}") + 1));
          meta = parsed.metadata;
        } catch (_) {
          // If metadata wasn't fully within 2KB, fallback to file stat
        }

        backups.push({
          filename: f,
          sizeBytes: stats.size,
          sizeFormatted: `${(stats.size / 1024).toFixed(1)} KB`,
          createdAt: meta ? meta.createdAt : stats.mtime,
          totalRecords: meta ? meta.totalRecords : null,
          summary: meta ? meta.summary : null,
          initiatedBy: meta ? meta.initiatedBy : "System"
        });
      } catch (err) {
        console.warn(`Could not parse backup ${f}:`, err.message);
      }
    }

    return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  /**
   * Get safe absolute file path for a backup file
   */
  getBackupPath(filename) {
    if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return null;
    }
    const safePath = path.join(BACKUPS_DIR, filename);
    if (!fs.existsSync(safePath)) return null;
    return safePath;
  },

  /**
   * Restore collections from a backup snapshot
   * Validates file integrity before writing.
   */
  async restoreBackup(filename, confirmed = false) {
    if (!confirmed) {
      throw new Error("Explicit confirmation is required to restore database from backup.");
    }

    const safePath = this.getBackupPath(filename);
    if (!safePath) {
      throw new Error(`Backup file '${filename}' not found or invalid path.`);
    }

    const rawData = fs.readFileSync(safePath, "utf8");
    const parsed = JSON.parse(rawData);

    if (!parsed || !parsed.collections || !parsed.metadata) {
      throw new Error("Corrupted or invalid backup file schema: missing metadata or collections.");
    }

    const { collections } = parsed;
    const restoredSummary = {};

    // Restore collections safely
    const modelMapping = {
      Product,
      Sale,
      PrintSale,
      Customer,
      Supplier,
      Branch,
      LocationStock,
      ProductBatch,
      StoreSettings,
      StockAudit,
      LedgerTransaction
    };

    for (const [modelName, Model] of Object.entries(modelMapping)) {
      if (collections[modelName] && Array.isArray(collections[modelName])) {
        const docs = collections[modelName];
        if (docs.length > 0) {
          // Clean existing and bulk insert restored documents
          await Model.deleteMany({});
          await Model.insertMany(docs, { ordered: false });
          restoredSummary[modelName] = docs.length;
        }
      }
    }

    return {
      success: true,
      message: `Database restored successfully from snapshot '${filename}'.`,
      restoredSummary
    };
  },

  /**
   * Delete a backup file
   */
  deleteBackup(filename) {
    const safePath = this.getBackupPath(filename);
    if (!safePath) {
      throw new Error("Backup file not found.");
    }
    fs.unlinkSync(safePath);
    return true;
  },

  /**
   * Prune backups older than retentionDays
   */
  pruneOldBackups(retentionDays = 30) {
    try {
      const days = parseInt(retentionDays) || 30;
      const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
      const files = fs.readdirSync(BACKUPS_DIR);
      let prunedCount = 0;

      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const filePath = path.join(BACKUPS_DIR, file);
        const stats = fs.statSync(filePath);
        if (stats.mtimeMs < cutoffTime) {
          fs.unlinkSync(filePath);
          prunedCount++;
          console.log(`[BackupService] Pruned expired backup: ${file} (Retention: ${days} days)`);
        }
      }
      return { success: true, prunedCount };
    } catch (err) {
      console.error("[BackupService] Error pruning old backups:", err.message);
      return { success: false, error: err.message };
    }
  }
};

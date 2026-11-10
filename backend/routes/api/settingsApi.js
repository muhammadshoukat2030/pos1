import express from "express";
import StoreSettings from "../../models/StoreSettings.js";
import { backupService } from "../../services/backupService.js";
import { isLoggedIn } from "../../middleware/isLoggedIn.js";
import { allowRoles } from "../../middleware/allowRoles.js";

const router = express.Router();

// =========================================================================
// 1. GET /api/settings - Retrieve store settings
// =========================================================================
router.get("/", async (req, res) => {
  try {
    const settings = await StoreSettings.getSettings();
    return res.json({ success: true, settings });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 2. PUT /api/settings - Update store & thermal print configuration
// =========================================================================
router.put("/", isLoggedIn, allowRoles("superadmin", "admin"), async (req, res) => {
  try {
    const {
      storeName,
      tagline,
      businessType,
      address,
      phone,
      currency,
      currencySymbol,
      timezone,
      taxRate,
      receiptFooter,
      urduFooterNotice,
      receiptHeaderNotice,
      receiptShowBarcode,
      receiptShowTax,
      receiptShowDiscounts,
      receiptWidth,
      defaultPosMode,
      activeTheme,
      logoUrl,
      backupSettings
    } = req.body;

    let settings = await StoreSettings.findOne();
    if (!settings) settings = new StoreSettings({});

    if (storeName !== undefined) settings.storeName = storeName.trim();
    if (tagline !== undefined) settings.tagline = tagline.trim();
    if (businessType !== undefined) settings.businessType = businessType.trim();
    if (address !== undefined) settings.address = address.trim();
    if (phone !== undefined) settings.phone = phone.trim();
    if (currency !== undefined) settings.currency = currency.trim();
    if (currencySymbol !== undefined) settings.currencySymbol = currencySymbol.trim();
    if (timezone !== undefined) settings.timezone = timezone.trim();
    if (taxRate !== undefined) settings.taxRate = parseFloat(taxRate) || 0;
    if (receiptFooter !== undefined) settings.receiptFooter = receiptFooter.trim();
    if (urduFooterNotice !== undefined) settings.urduFooterNotice = urduFooterNotice.trim();
    if (receiptHeaderNotice !== undefined) settings.receiptHeaderNotice = receiptHeaderNotice.trim();
    if (receiptShowBarcode !== undefined) settings.receiptShowBarcode = Boolean(receiptShowBarcode);
    if (receiptShowTax !== undefined) settings.receiptShowTax = Boolean(receiptShowTax);
    if (receiptShowDiscounts !== undefined) settings.receiptShowDiscounts = Boolean(receiptShowDiscounts);
    if (receiptWidth !== undefined) settings.receiptWidth = receiptWidth;
    if (defaultPosMode !== undefined) settings.defaultPosMode = defaultPosMode;
    if (activeTheme !== undefined) settings.activeTheme = activeTheme;
    if (logoUrl !== undefined) settings.logoUrl = logoUrl.trim();

    if (backupSettings && typeof backupSettings === "object") {
      settings.backupSettings = {
        ...settings.backupSettings,
        autoBackupEnabled: Boolean(backupSettings.autoBackupEnabled),
        backupFrequency: backupSettings.backupFrequency || "daily",
        retentionDays: parseInt(backupSettings.retentionDays) || 30
      };
    }

    await settings.save();

    return res.json({
      success: true,
      message: "Store & receipt settings updated successfully!",
      settings
    });
  } catch (err) {
    console.error("Settings Update Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 3. POST /api/settings/switch-theme
// =========================================================================
router.post("/switch-theme", isLoggedIn, async (req, res) => {
  try {
    const { theme } = req.body;
    const allowed = ["light", "dark", "bizcare-teal", "eproduct-blue", "ixershop-navy", "slate-dark"];

    if (!allowed.includes(theme)) {
      return res.status(400).json({ success: false, message: "Invalid theme name." });
    }

    let settings = await StoreSettings.getSettings();
    settings.activeTheme = theme;
    await settings.save();

    return res.json({ success: true, theme, message: `Theme switched to ${theme}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 4. POST /api/settings/backup/create - Generate JSON backup snapshot
// =========================================================================
router.post("/backup/create", isLoggedIn, allowRoles("superadmin", "admin"), async (req, res) => {
  try {
    const initiatedBy = req.user?.username || "Admin";
    const backupResult = await backupService.createBackup(initiatedBy);
    return res.status(201).json({
      success: true,
      message: `Database backup snapshot '${backupResult.filename}' generated successfully!`,
      backup: backupResult
    });
  } catch (err) {
    console.error("Backup creation error:", err);
    return res.status(500).json({ success: false, message: "Backup failed: " + err.message });
  }
});

// =========================================================================
// 5. GET /api/settings/backup/list - List all backup snapshots
// =========================================================================
router.get("/backup/list", isLoggedIn, allowRoles("superadmin", "admin"), async (req, res) => {
  try {
    const backups = await backupService.listBackups();
    return res.json({ success: true, backups, count: backups.length });
  } catch (err) {
    console.error("Backup listing error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 6. GET /api/settings/backup/download/:filename - Secure download backup
// =========================================================================
router.get("/backup/download/:filename", isLoggedIn, allowRoles("superadmin", "admin"), (req, res) => {
  try {
    const { filename } = req.params;
    const safePath = backupService.getBackupPath(filename);
    if (!safePath) {
      return res.status(404).json({ success: false, message: "Backup snapshot file not found." });
    }

    res.download(safePath, filename, (err) => {
      if (err) {
        console.error("Download error:", err);
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 7. POST /api/settings/backup/restore/:filename - Restore from snapshot
// =========================================================================
router.post("/backup/restore/:filename", isLoggedIn, allowRoles("superadmin", "admin"), async (req, res) => {
  try {
    const { filename } = req.params;
    const { confirmed } = req.body;

    if (!confirmed) {
      return res.status(400).json({
        success: false,
        message: "Confirmation required to restore database. Existing data will be restored to snapshot state."
      });
    }

    const restoreResult = await backupService.restoreBackup(filename, true);
    return res.json(restoreResult);
  } catch (err) {
    console.error("Restore error:", err);
    return res.status(500).json({ success: false, message: "Database restoration failed: " + err.message });
  }
});

// =========================================================================
// 8. DELETE /api/settings/backup/:filename - Delete backup snapshot
// =========================================================================
router.delete("/backup/:filename", isLoggedIn, allowRoles("superadmin", "admin"), (req, res) => {
  try {
    const { filename } = req.params;
    backupService.deleteBackup(filename);
    return res.json({ success: true, message: `Backup file '${filename}' deleted successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

import StoreSettings from "../models/StoreSettings.js";
import { backupService } from "./backupService.js";

let schedulerInterval = null;
let isBackupRunning = false;

/**
 * Evaluates whether an automated backup should run right now
 */
export async function checkAndRunAutomatedBackup() {
  if (isBackupRunning) {
    console.log("[BackupScheduler] Backup already in progress. Skipping tick.");
    return;
  }

  try {
    const settings = await StoreSettings.findOne();
    if (!settings || !settings.backupSettings?.autoBackupEnabled) {
      return; // Automated backups disabled by admin
    }

    const { backupFrequency = "daily", lastBackupDate, retentionDays = 30 } = settings.backupSettings;

    // Calculate required interval in milliseconds
    let requiredIntervalMs = 24 * 60 * 60 * 1000; // default daily: 24h
    if (backupFrequency === "weekly") {
      requiredIntervalMs = 7 * 24 * 60 * 60 * 1000;
    } else if (backupFrequency === "monthly") {
      requiredIntervalMs = 30 * 24 * 60 * 60 * 1000;
    }

    const now = Date.now();
    const lastBackupTime = lastBackupDate ? new Date(lastBackupDate).getTime() : 0;
    const timeSinceLastBackup = now - lastBackupTime;

    if (timeSinceLastBackup >= requiredIntervalMs) {
      isBackupRunning = true;
      console.log(`[BackupScheduler] Due for automated backup (${backupFrequency}). Starting snapshot...`);

      const result = await backupService.createBackup("System_Automated_Scheduler");

      // Update last backup timestamp
      settings.backupSettings.lastBackupDate = new Date();
      await settings.save();

      console.log(`[BackupScheduler] Automated backup created successfully: ${result.filename} (${result.sizeFormatted})`);

      // Enforce retention policy
      backupService.pruneOldBackups(retentionDays);
    }
  } catch (err) {
    console.error("[BackupScheduler] Error executing automated backup:", err.message);
  } finally {
    isBackupRunning = false;
  }
}

/**
 * Initialize backup scheduler on server startup
 * Checks every 30 minutes in the background
 */
export function initBackupScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  console.log("⏰ [BackupScheduler] Background automated backup worker initialized (Checks every 30m).");

  // Initial check after 30 seconds of server boot
  setTimeout(() => {
    checkAndRunAutomatedBackup().catch((e) =>
      console.error("[BackupScheduler] Boot check error:", e.message)
    );
  }, 30 * 1000);

  // Periodic recurring check every 30 minutes
  schedulerInterval = setInterval(() => {
    checkAndRunAutomatedBackup().catch((e) =>
      console.error("[BackupScheduler] Interval error:", e.message)
    );
  }, 30 * 60 * 1000);

  return schedulerInterval;
}

export function stopBackupScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[BackupScheduler] Background backup worker stopped.");
  }
}

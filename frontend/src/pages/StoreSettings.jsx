import React, { useState, useEffect } from "react";
import api from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import {
  Settings,
  Store,
  Palette,
  Printer,
  Receipt,
  Save,
  CheckCircle,
  Building,
  Phone,
  MapPin,
  Percent,
  Check,
  RotateCcw,
  Shield,
  Users,
  UserPlus,
  Database,
  Download,
  RefreshCw,
  Trash2,
  Edit3,
  Key,
  AlertTriangle,
  Clock,
  HardDrive,
  FileText
} from "lucide-react";

const THEME_OPTIONS = [
  {
    id: "bizcare-teal",
    name: "Bizcare Teal ERP",
    desc: "Teal gradient header with executive dashboard aesthetic and clean rings.",
    primary: "#0d9488",
    headerBg: "from-teal-800 via-teal-700 to-teal-900",
    badge: "Image 2 Style"
  },
  {
    id: "eproduct-blue",
    name: "eProduct Royal Blue",
    desc: "Deep royal blue with signature white active pill cutout and floating rows.",
    primary: "#2563eb",
    headerBg: "from-blue-800 via-blue-700 to-indigo-900",
    badge: "Image 1 Style"
  },
  {
    id: "ixershop-navy",
    name: "IXERSHOP Navy POS",
    desc: "Dark navy high-speed cashier terminal with high-contrast shortcut bar.",
    primary: "#0f172a",
    headerBg: "from-slate-900 via-slate-850 to-slate-950",
    badge: "Image 3 Style"
  },
  {
    id: "slate-dark",
    name: "Slate Dark Mode",
    desc: "Sleek low-light night theme designed for reduced eye strain during long shifts.",
    primary: "#3b82f6",
    headerBg: "from-slate-950 via-slate-900 to-slate-950",
    badge: "Dark Theme"
  }
];

const BUSINESS_TYPES = [
  "Super Mart & Grocery",
  "Departmental Store",
  "Hardware & Paint Store",
  "Pharmacy & Healthcare",
  "General Retail Business",
  "Wholesale & Distribution",
  "Electronics & Mobile Shop"
];

const ROLE_CONFIG = {
  superadmin: { label: "Super Admin", color: "bg-purple-100 text-purple-800 border-purple-200" },
  admin: { label: "Store Admin", color: "bg-blue-100 text-blue-800 border-blue-200" },
  manager: { label: "Store Manager", color: "bg-teal-100 text-teal-800 border-teal-200" },
  cashier: { label: "Cashier / Staff", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  inventory: { label: "Inventory Staff", color: "bg-amber-100 text-amber-800 border-amber-200" },
  accountant: { label: "Accountant", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  worker: { label: "Cashier (Legacy)", color: "bg-slate-100 text-slate-800 border-slate-200" }
};

export default function StoreSettings() {
  const { theme, changeTheme, fetchSettings: refreshThemeSettings } = useTheme();
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState("store");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [formData, setFormData] = useState({
    storeName: "Universal Super Mart & POS",
    tagline: "Retail & Inventory ERP",
    businessType: "Super Mart & Grocery",
    address: "Main Commercial Market, Pakistan",
    phone: "0300-1234567",
    currency: "PKR",
    currencySymbol: "Rs.",
    timezone: "Asia/Karachi",
    taxRate: 0,
    receiptFooter: "Thank You! Visit Again",
    urduFooterNotice: "مال کی واپسی یا تبدیلی 3 دن کے اندر بل کے ساتھ ہو سکے گی",
    receiptHeaderNotice: "TAX INVOICE / CASH MEMO",
    receiptShowBarcode: true,
    receiptShowTax: true,
    receiptShowDiscounts: true,
    receiptWidth: "80mm",
    defaultPosMode: "hybrid",
    activeTheme: "bizcare-teal",
    logoUrl: "",
    backupSettings: {
      autoBackupEnabled: true,
      backupFrequency: "daily",
      retentionDays: 30,
      lastBackupDate: null
    }
  });

  // Users State (RBAC)
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    id: null,
    username: "",
    password: "",
    fullName: "",
    email: "",
    phone: "",
    role: "cashier",
    branchId: "",
    isActive: true
  });

  // Backups State
  const [backups, setBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoreModal, setRestoreModal] = useState({ open: false, filename: "", confirmText: "" });
  const [restoring, setRestoring] = useState(false);

  // 1. Fetch Store Settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/settings");
      if (res.data.success && res.data.settings) {
        setFormData((prev) => ({
          ...prev,
          ...res.data.settings,
          backupSettings: {
            ...prev.backupSettings,
            ...(res.data.settings.backupSettings || {})
          }
        }));
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load store settings", "error");
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Users (RBAC)
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const [uRes, bRes] = await Promise.all([
        api.get("/auth/users"),
        api.get("/branches").catch(() => ({ data: { branches: [] } }))
      ]);
      if (uRes.data.success) {
        setUsers(uRes.data.users || []);
      }
      if (bRes.data.success) {
        setBranches(bRes.data.branches || []);
      }
    } catch (err) {
      console.warn("Could not fetch users/branches:", err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  // 3. Fetch Backups
  const fetchBackups = async () => {
    try {
      setLoadingBackups(true);
      const res = await api.get("/settings/backup/list");
      if (res.data.success) {
        setBackups(res.data.backups || []);
      }
    } catch (err) {
      console.warn("Could not fetch backups:", err.message);
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === "rbac") {
      fetchUsers();
    } else if (activeTab === "backup") {
      fetchBackups();
    }
  }, [activeTab]);

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleBackupSettingChange = (field, val) => {
    setFormData((prev) => ({
      ...prev,
      backupSettings: {
        ...prev.backupSettings,
        [field]: val
      }
    }));
  };

  const handleSelectTheme = (themeId) => {
    changeTheme(themeId);
    handleChange("activeTheme", themeId);
  };

  // Save Settings
  const handleSubmitSettings = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put("/settings", formData);
      if (res.data.success) {
        showToast(res.data.message || "Store settings updated successfully!", "success");
        refreshThemeSettings();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  // User RBAC handlers
  const handleOpenUserModal = (user = null) => {
    if (user) {
      setUserForm({
        id: user._id,
        username: user.username,
        password: "", // blank unless resetting
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role || "cashier",
        branchId: user.branchId?._id || user.branchId || "",
        isActive: user.isActive !== undefined ? user.isActive : true
      });
    } else {
      setUserForm({
        id: null,
        username: "",
        password: "",
        fullName: "",
        email: "",
        phone: "",
        role: "cashier",
        branchId: branches[0]?._id || "",
        isActive: true
      });
    }
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (userForm.id) {
        // Update user
        const payload = {
          fullName: userForm.fullName,
          email: userForm.email,
          phone: userForm.phone,
          role: userForm.role,
          branchId: userForm.branchId || null,
          isActive: userForm.isActive
        };
        if (userForm.password && userForm.password.trim()) {
          payload.password = userForm.password.trim();
        }
        const res = await api.put(`/auth/user/${userForm.id}`, payload);
        if (res.data.success) {
          showToast("User updated successfully!", "success");
          setUserModalOpen(false);
          fetchUsers();
        }
      } else {
        // Create user
        if (!userForm.password) {
          showToast("Password is required for new accounts.", "error");
          return;
        }
        const res = await api.post("/auth/create-user", userForm);
        if (res.data.success) {
          showToast(res.data.message || "Staff member created successfully!", "success");
          setUserModalOpen(false);
          fetchUsers();
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save user", "error");
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user account '${username}'?`)) return;
    try {
      const res = await api.delete(`/auth/user/${userId}`);
      if (res.data.success) {
        showToast("User removed successfully.", "success");
        fetchUsers();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to remove user", "error");
    }
  };

  // Backups handlers
  const handleCreateBackup = async () => {
    try {
      setCreatingBackup(true);
      const res = await api.post("/settings/backup/create");
      if (res.data.success) {
        showToast(res.data.message || "Backup archive created successfully!", "success");
        fetchBackups();
        fetchSettings();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Backup creation failed", "error");
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDownloadBackup = (filename) => {
    window.open(`/api/settings/backup/download/${filename}`, "_blank");
  };

  const handleOpenRestore = (filename) => {
    setRestoreModal({ open: true, filename, confirmText: "" });
  };

  const handleExecuteRestore = async () => {
    if (restoreModal.confirmText !== "RESTORE") {
      showToast("Please type RESTORE in capital letters to confirm.", "error");
      return;
    }
    try {
      setRestoring(true);
      const res = await api.post(`/settings/backup/restore/${restoreModal.filename}`);
      if (res.data.success) {
        showToast("Database restored successfully!", "success");
        setRestoreModal({ open: false, filename: "", confirmText: "" });
        refreshThemeSettings();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Database restoration failed", "error");
    } finally {
      setRestoring(false);
    }
  };

  const handleDeleteBackup = async (filename) => {
    if (!window.confirm(`Delete backup snapshot '${filename}'? This cannot be undone.`)) return;
    try {
      const res = await api.delete(`/settings/backup/${filename}`);
      if (res.data.success) {
        showToast("Backup deleted successfully.", "success");
        fetchBackups();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete backup", "error");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <Settings className="text-teal-600" size={26} />
            Store Management & System Settings
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Store Profile, Thermal Slip Layout, Role-Based Access Control, Backups & Recovery, and Themes.
          </p>
        </div>

        {activeTab !== "rbac" && activeTab !== "backup" && (
          <button
            onClick={handleSubmitSettings}
            disabled={saving}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg shadow-xs transition self-start md:self-auto cursor-pointer"
          >
            <Save size={18} />
            {saving ? "Saving Changes..." : "Save Settings"}
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-3 pt-2 rounded-t-xl gap-2 overflow-x-auto shadow-2xs">
        <button
          onClick={() => setActiveTab("store")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "store"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Store size={18} />
          Store & Branding
        </button>

        <button
          onClick={() => setActiveTab("receipt")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "receipt"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Receipt size={18} />
          Receipt & Thermal Print
        </button>

        <button
          onClick={() => setActiveTab("rbac")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "rbac"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users size={18} />
          Staff & Roles (RBAC)
        </button>

        <button
          onClick={() => setActiveTab("backup")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "backup"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Database size={18} />
          Database Backups
        </button>

        <button
          onClick={() => setActiveTab("theme")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "theme"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Palette size={18} />
          Themes & Styling
        </button>
      </div>

      {/* TAB 1: Store & Branding */}
      {activeTab === "store" && (
        <form onSubmit={handleSubmitSettings} className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2.5 pb-3 mb-5 border-b border-slate-100">
              <Store className="text-teal-600" size={20} />
              <h2 className="text-base font-bold text-slate-800">Store Profile & Branding Identity</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Store / Mart Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.storeName}
                  onChange={(e) => handleChange("storeName", e.target.value)}
                  placeholder="e.g. Al-Madina Super Mart"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => handleChange("tagline", e.target.value)}
                  placeholder="e.g. Quality Goods at Wholesale Rates"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Business Vertical / Category
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) => handleChange("businessType", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  {BUSINESS_TYPES.map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Contact Phone / WhatsApp
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="e.g. 0300-1234567"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Store Logo URL (Optional)
                </label>
                <input
                  type="text"
                  value={formData.logoUrl}
                  onChange={(e) => handleChange("logoUrl", e.target.value)}
                  placeholder="e.g. /images/store-logo.png"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Default POS Layout
                </label>
                <select
                  value={formData.defaultPosMode}
                  onChange={(e) => handleChange("defaultPosMode", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="hybrid">Hybrid (Barcode Bar + Grid Toggle)</option>
                  <option value="barcode">Barcode Fast Scan Only (Cashier)</option>
                  <option value="grid">Visual Touch Grid Only (Touchscreen)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Store Physical Address (Printed on Receipts)
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="e.g. Shop # 14-B, Commercial Market, Rawalpindi"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2.5 pb-3 mb-5 border-b border-slate-100">
              <Percent className="text-teal-600" size={20} />
              <h2 className="text-base font-bold text-slate-800">Financial & Currency Standards</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Currency Code
                </label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) => handleChange("currency", e.target.value)}
                  placeholder="PKR"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={formData.currencySymbol}
                  onChange={(e) => handleChange("currencySymbol", e.target.value)}
                  placeholder="Rs."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Default Sales Tax / GST (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.taxRate}
                  onChange={(e) => handleChange("taxRate", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Operating Timezone
                </label>
                <input
                  type="text"
                  value={formData.timezone}
                  onChange={(e) => handleChange("timezone", e.target.value)}
                  placeholder="Asia/Karachi"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={fetchSettings}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <RotateCcw size={16} /> Reset
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg shadow-xs transition cursor-pointer"
            >
              <Save size={18} />
              {saving ? "Saving Changes..." : "Save Settings"}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Receipt & Thermal Print Setup */}
      {activeTab === "receipt" && (
        <form onSubmit={handleSubmitSettings} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Settings */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2.5 pb-3 mb-5 border-b border-slate-100">
                  <Printer className="text-teal-600" size={20} />
                  <h2 className="text-base font-bold text-slate-800">Thermal Printer Specifications</h2>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Thermal Slip Paper Width
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        onClick={() => handleChange("receiptWidth", "80mm")}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition flex items-center justify-between ${
                          formData.receiptWidth === "80mm"
                            ? "border-teal-600 bg-teal-50/50 text-teal-900 font-bold"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div>
                          <div className="text-sm">Standard 80mm</div>
                          <div className="text-3xs text-slate-500 font-normal">Supermarkets & Marts (Default)</div>
                        </div>
                        {formData.receiptWidth === "80mm" && <Check size={18} className="text-teal-600" />}
                      </div>

                      <div
                        onClick={() => handleChange("receiptWidth", "58mm")}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition flex items-center justify-between ${
                          formData.receiptWidth === "58mm"
                            ? "border-teal-600 bg-teal-50/50 text-teal-900 font-bold"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div>
                          <div className="text-sm">Compact 58mm</div>
                          <div className="text-3xs text-slate-500 font-normal">Mini Marts, Kiosks & Cafes</div>
                        </div>
                        {formData.receiptWidth === "58mm" && <Check size={18} className="text-teal-600" />}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Header Memo Notice (Top of Slip)
                    </label>
                    <input
                      type="text"
                      value={formData.receiptHeaderNotice}
                      onChange={(e) => handleChange("receiptHeaderNotice", e.target.value)}
                      placeholder="e.g. TAX INVOICE / CASH MEMO"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      English Footer Closing Text
                    </label>
                    <input
                      type="text"
                      value={formData.receiptFooter}
                      onChange={(e) => handleChange("receiptFooter", e.target.value)}
                      placeholder="Thank You! Visit Again"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Urdu Return Policy Notice (Bottom of Slip)
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={formData.urduFooterNotice}
                      onChange={(e) => handleChange("urduFooterNotice", e.target.value)}
                      placeholder="مال کی واپسی یا تبدیلی 3 دن کے اندر بل کے ساتھ ہو سکے گی"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-right font-sans"
                    />
                  </div>

                  {/* Receipt Display Toggles */}
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Receipt Fields Visibility
                    </label>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.receiptShowBarcode !== false}
                        onChange={(e) => handleChange("receiptShowBarcode", e.target.checked)}
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                      />
                      <span className="text-sm text-slate-700">Print Scannable Code128 Barcode on Thermal Slips</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.receiptShowTax !== false}
                        onChange={(e) => handleChange("receiptShowTax", e.target.checked)}
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                      />
                      <span className="text-sm text-slate-700">Print Sales Tax / GST Line</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.receiptShowDiscounts !== false}
                        onChange={(e) => handleChange("receiptShowDiscounts", e.target.checked)}
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                      />
                      <span className="text-sm text-slate-700">Print Discount Breakdown Line</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Receipt Preview */}
            <div className="lg:col-span-5">
              <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 shadow-inner">
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Live Thermal Print Preview</span>
                  <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-3xs font-mono">{formData.receiptWidth}</span>
                </div>

                <div 
                  className={`bg-white text-black p-4 font-mono shadow-md mx-auto border border-dashed border-slate-300 text-xs ${
                    formData.receiptWidth === "58mm" ? "max-w-[220px] text-[10px]" : "max-w-[280px]"
                  }`}
                  style={{ fontFamily: "'Courier New', Courier, monospace" }}
                >
                  <div className="text-center pb-2 border-b border-dashed border-black">
                    <h3 className="font-bold text-sm uppercase">{formData.storeName || "Universal POS"}</h3>
                    <p className="text-[10px] text-gray-700">{formData.tagline}</p>
                    <p className="text-[10px] text-gray-600">{formData.address}</p>
                    <p className="text-[10px] font-semibold">Tel: {formData.phone}</p>
                    {formData.receiptHeaderNotice && (
                      <div className="mt-1 border border-dashed border-gray-400 py-0.5 text-[9px] uppercase font-bold">
                        {formData.receiptHeaderNotice}
                      </div>
                    )}
                  </div>

                  <div className="py-2 border-b border-dashed border-black text-[10px] space-y-0.5">
                    <div className="flex justify-between font-bold">
                      <span>Bill #: INV-009842</span>
                      <span>14:32</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Date: 09/11/2026</span>
                      <span>Mode: Cash</span>
                    </div>
                    <div className="truncate text-gray-700">Customer: Walk-in Customer</div>
                  </div>

                  <div className="py-2 border-b border-dashed border-black text-[10px]">
                    <div className="flex justify-between font-bold border-b border-gray-300 pb-1 mb-1">
                      <span>Item</span>
                      <span>Qty x Rate = Total</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="truncate max-w-[120px]">Basmati Rice 5kg</span>
                      <span>1 x 1450 = 1450</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="truncate max-w-[120px]">Cooking Oil 1L</span>
                      <span>2 x 520 = 1040</span>
                    </div>
                  </div>

                  <div className="py-2 border-b border-dashed border-black text-[10.5px] space-y-0.5">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formData.currencySymbol} 2,490.00</span>
                    </div>
                    {formData.receiptShowDiscounts && (
                      <div className="flex justify-between text-gray-700">
                        <span>Discount:</span>
                        <span>-{formData.currencySymbol} 90.00</span>
                      </div>
                    )}
                    {formData.receiptShowTax && (
                      <div className="flex justify-between text-gray-700">
                        <span>Tax ({formData.taxRate}%):</span>
                        <span>+{formData.currencySymbol} 0.00</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-300">
                      <span>GRAND TOTAL:</span>
                      <span>{formData.currencySymbol} 2,400.00</span>
                    </div>
                  </div>

                  <div className="text-center pt-2 space-y-1">
                    {formData.receiptShowBarcode && (
                      <div className="border border-dashed border-gray-400 py-1.5 my-1 text-[9px] font-mono tracking-widest bg-gray-50">
                        ||||| | |||| || ||||| | |||
                        <div className="text-[8px] tracking-normal">INV-009842</div>
                      </div>
                    )}
                    <p className="font-bold text-[10px] mt-1">{formData.receiptFooter}</p>
                    <p className="font-sans text-[10px] leading-tight text-gray-800">{formData.urduFooterNotice}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg shadow-xs transition cursor-pointer"
            >
              <Save size={18} />
              {saving ? "Saving Changes..." : "Save Thermal Settings"}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: Staff & Role Permissions (RBAC) */}
      {activeTab === "rbac" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Shield className="text-teal-600" size={20} />
                  Role-Based Access Control (RBAC) & Staff Accounts
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage staff credentials, assigned branches, roles, and backend permissions.
                </p>
              </div>

              <button
                onClick={() => handleOpenUserModal()}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm px-4 py-2 rounded-lg shadow-xs transition cursor-pointer"
              >
                <UserPlus size={16} />
                Add Staff Member
              </button>
            </div>

            {/* Users Table */}
            {loadingUsers ? (
              <div className="py-12 text-center text-slate-500">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-teal-600" />
                Loading staff accounts...
              </div>
            ) : users.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                No users found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-3xs font-semibold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Branch Assignment</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => {
                      const roleMeta = ROLE_CONFIG[u.role] || { label: u.role, color: "bg-slate-100 text-slate-800" };
                      const isMe = currentUser?.id === u._id;
                      return (
                        <tr key={u._id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">{u.fullName || u.username}</div>
                            <div className="text-xs text-slate-500 font-mono">@{u.username} {isMe && "(You)"}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${roleMeta.color}`}>
                              {roleMeta.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {u.branchId ? (
                              <div className="font-medium">
                                {u.branchId.name || "Assigned Branch"}
                                <span className="text-slate-400 font-mono text-3xs ml-1">({u.branchId.code})</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">All Branches / Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            <div>{u.phone || "—"}</div>
                            <div className="text-slate-400">{u.email || ""}</div>
                          </td>
                          <td className="py-3 px-4">
                            {u.isActive !== false ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Disabled
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenUserModal(u)}
                                className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded transition cursor-pointer"
                                title="Edit User"
                              >
                                <Edit3 size={16} />
                              </button>
                              {!isMe && (
                                <button
                                  onClick={() => handleDeleteUser(u._id, u.username)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                  title="Delete User"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Role Permissions Matrix Info Box */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
              Standard Permission Matrix by Role
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="font-bold text-purple-800 mb-1 flex items-center gap-1.5">
                  <Shield size={14} /> Super Admin & Admin
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Full system control. Can create/edit users, manage branch locations, void invoices, delete products, execute database backups & restorations.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="font-bold text-teal-800 mb-1 flex items-center gap-1.5">
                  <Shield size={14} /> Store Manager & Inventory Staff
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Product catalog management, batch receiving (FEFO), stock adjustments, warehouse transfers, customer credit ledger, sales refunds & profit reports.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
                  <Shield size={14} /> Cashier & Staff
                </div>
                <p className="text-slate-600 leading-relaxed">
                  POS terminal operation, barcode scanning, cart processing, split payments, hold bills, and daily shift summaries. Protected from deletions and refunds.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Database Backups & Disaster Recovery */}
      {activeTab === "backup" && (
        <div className="space-y-6">
          {/* Action & Automation Settings */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Database className="text-teal-600" size={20} />
                  Database Backups & Disaster Recovery
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Export snapshot archives of sales, products, batches, customer ledgers, and restore securely.
                </p>
              </div>

              <button
                onClick={handleCreateBackup}
                disabled={creatingBackup}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium text-sm px-5 py-2.5 rounded-lg shadow-xs transition cursor-pointer"
              >
                <HardDrive size={18} />
                {creatingBackup ? "Creating Snapshot..." : "Create Backup Snapshot Now"}
              </button>
            </div>

            {/* Automation Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Automated Backups
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.backupSettings?.autoBackupEnabled !== false}
                    onChange={(e) => handleBackupSettingChange("autoBackupEnabled", e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-slate-800">Enable Automated Snapshots</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Backup Frequency
                </label>
                <select
                  value={formData.backupSettings?.backupFrequency || "daily"}
                  onChange={(e) => handleBackupSettingChange("backupFrequency", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="daily">Daily Automated Snapshot</option>
                  <option value="weekly">Weekly Automated Snapshot</option>
                  <option value="monthly">Monthly Snapshot</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Retention Window (Days)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={formData.backupSettings?.retentionDays || 30}
                    onChange={(e) => handleBackupSettingChange("retentionDays", parseInt(e.target.value) || 30)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSubmitSettings}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer transition whitespace-nowrap"
                  >
                    Save Rules
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Snapshots Table */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText size={18} className="text-teal-600" />
                Available Snapshot Archives ({backups.length})
              </h3>
              <button
                onClick={fetchBackups}
                className="text-xs text-slate-500 hover:text-teal-600 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {loadingBackups ? (
              <div className="py-12 text-center text-slate-500">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-teal-600" />
                Loading backup history...
              </div>
            ) : backups.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-sm">
                No backup archives found. Click "Create Backup Snapshot Now" to create your first archive.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-3xs font-semibold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Backup Archive File</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Total Records</th>
                      <th className="py-3 px-4">Archive Size</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {backups.map((b) => (
                      <tr key={b.filename} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 font-mono text-xs">{b.filename}</div>
                          <div className="text-3xs text-slate-500">Initiator: {b.initiator || "System"}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {b.createdAt ? new Date(b.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-xs font-semibold">
                            {b.totalRecords || 0} docs
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600">
                          {b.sizeFormatted || `${(b.sizeBytes / 1024).toFixed(1)} KB`}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleDownloadBackup(b.filename)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded transition cursor-pointer"
                              title="Download JSON Archive"
                            >
                              <Download size={14} /> Download
                            </button>
                            <button
                              onClick={() => handleOpenRestore(b.filename)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded transition cursor-pointer"
                              title="Restore Database from this file"
                            >
                              <RotateCcw size={14} /> Restore
                            </button>
                            <button
                              onClick={() => handleDeleteBackup(b.filename)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                              title="Delete Archive"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: Themes & Styling */}
      {activeTab === "theme" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-slate-100">
              <Palette className="text-teal-600" size={20} />
              <h2 className="text-base font-bold text-slate-800">
                Active Visual Theme & Styling
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {THEME_OPTIONS.map((t) => {
                const isActive = theme === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTheme(t.id)}
                    className={`p-4 rounded-xl border-2 transition cursor-pointer relative flex flex-col justify-between ${
                      isActive
                        ? "border-teal-600 bg-teal-50/50 shadow-md ring-2 ring-teal-500/20"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-xs">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}

                    <div>
                      <div
                        className={`h-12 w-full rounded-lg bg-gradient-to-r ${t.headerBg} mb-3 flex items-center px-3 shadow-inner`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white/30 mr-2" />
                        <div className="w-16 h-2 rounded bg-white/40" />
                      </div>

                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-sm text-slate-800">{t.name}</h4>
                      </div>
                      <span className="inline-block px-2 py-0.5 text-3xs font-semibold uppercase bg-slate-100 text-slate-600 rounded mb-2">
                        {t.badge}
                      </span>
                      <p className="text-xs text-slate-500 leading-relaxed">{t.desc}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Primary Accent</span>
                      <div className="flex items-center gap-1.5 font-mono text-3xs">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs"
                          style={{ backgroundColor: t.primary }}
                        />
                        <span>{t.primary}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* User RBAC Modal (Create / Edit) */}
      {userModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Shield className="text-teal-600" size={20} />
              {userForm.id ? "Edit Staff Account" : "Add New Staff Member"}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(userForm.id)}
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    placeholder="e.g. cashier1"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={userForm.fullName}
                    onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                    placeholder="e.g. Muhammad Ali"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  {userForm.id ? "New Password (Leave blank to keep current)" : "Password *"}
                </label>
                <input
                  type="password"
                  required={!userForm.id}
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder={userForm.id ? "••••••••" : "Enter secure password"}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    System Role *
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="cashier">Cashier / Staff (POS Only)</option>
                    <option value="inventory">Inventory Staff</option>
                    <option value="accountant">Accountant / Finance</option>
                    <option value="manager">Store Manager</option>
                    <option value="admin">Store Administrator</option>
                    {currentUser?.role === "superadmin" && (
                      <option value="superadmin">Super Administrator</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Branch Assignment
                  </label>
                  <select
                    value={userForm.branchId}
                    onChange={(e) => setUserForm({ ...userForm, branchId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="">Global / All Branches</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="staff@store.com"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Phone / Mobile
                  </label>
                  <input
                    type="text"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    placeholder="0300-1234567"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userForm.isActive}
                    onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-slate-800">Account is Active and Allowed to Login</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow-xs transition cursor-pointer"
                >
                  {userForm.id ? "Update User" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restore Database Confirmation Modal */}
      {restoreModal.open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-red-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertTriangle size={28} />
              <h3 className="text-lg font-bold">Confirm Database Restoration</h3>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed mb-4">
              Restoring from <strong className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">{restoreModal.filename}</strong> will overwrite current collections (sales, products, batches, customer ledgers) with this snapshot's state.
            </p>

            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 mb-4">
              <strong>CRITICAL WARNING:</strong> Any transactions or stock changes made after this snapshot was taken will be replaced. Please make a fresh backup first if needed.
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Type <strong className="text-rose-600">RESTORE</strong> to confirm:
              </label>
              <input
                type="text"
                value={restoreModal.confirmText}
                onChange={(e) => setRestoreModal({ ...restoreModal, confirmText: e.target.value })}
                placeholder="RESTORE"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tracking-widest text-center uppercase focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRestoreModal({ open: false, filename: "", confirmText: "" })}
                disabled={restoring}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={restoreModal.confirmText !== "RESTORE" || restoring}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg shadow-xs cursor-pointer transition"
              >
                {restoring ? "Restoring Database..." : "Execute Restore"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

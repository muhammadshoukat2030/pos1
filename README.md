# 🚀 Universal Multi-Business ERP, Inventory & Super Mart POS System (MERN Stack)

A high-performance, enterprise-grade **MERN Stack (MongoDB, Express.js, React.js, Node.js)** system engineered for **Super Marts, Departmental Stores, Grocery Chains, Pharmacies, Hardware/Paint Stores, and General Retail Businesses**.

Transformed from a single-client store into a **Universal Enterprise Suite** featuring 3 bespoke UI/UX designs:
1. **eProduct (Image 1):** Floating order row management with Royal Blue selection, active cutout pill sidebar, and Mobile/Tablet Picture Grid catalog with circular `+` quick-add buttons.
2. **Bizcare ERP (Image 2):** Executive & Financial Dashboard featuring Teal gradient wave header banner, AI Business Insight strip, 4-column PKR KPI cards with decorative corner watermark rings, and 3-metric Liquidity & Working Capital strip.
3. **IXERSHOP POS (Image 3):** High-speed Retail POS Terminal with Barcode/SKU entry, decimal quantity support, itemized sale table, customer/order panel, and sticky function-key bar `(F1)`–`(F10)` triggering 80mm thermal receipt printing.

---

## 🏗️ Modern Architecture Overview

```
pos/
├── backend/                  # Node.js + Express.js REST JSON API
│   ├── app.js                # Server entry point (Port 5000), SPA fallback, compression
│   ├── config/               # Database connection (MongoDB via Mongoose)
│   ├── middleware/           # isLoggedIn (JWT+Bearer), allowRoles, checkIPBlocked
│   ├── models/               # MongoDB Mongoose Schemas:
│   │   ├── Admin.js          # Authentication & user roles (admin, worker)
│   │   ├── Agent.js          # Sales agents & commission tracking
│   │   ├── Customer.js       # Customer Khata / Accounts Receivable (AR)
│   │   ├── Item.js           # Agent items sold
│   │   ├── ItemDefinition.js # Dynamic brand & spec configurations
│   │   ├── LedgerTransaction.js # Credit sales, payments, cash-ins/outs
│   │   ├── PrintSale.js      # Invoice & thermal receipt printing records
│   │   ├── Product.js        # Products, stock, barcode, cost/sale price
│   │   ├── Sale.js           # Itemized sale transactions & profit
│   │   ├── StockAudit.js     # Stock adjustments & audit log
│   │   ├── StoreSettings.js  # Store branding, currency, tax & theme
│   │   └── Supplier.js       # Vendors & payables
│   └── routes/
│       ├── api/              # Complete JSON REST API
│       │   ├── authApi.js        # /api/auth (Direct login, session, user CRUD)
│       │   ├── dashboardApi.js   # /api/dashboard/stats (KPIs, charts, liquidity)
│       │   ├── productsApi.js    # /api/products (CRUD, adjust stock, audits)
│       │   ├── salesApi.js       # /api/sales (Checkout, invoice, history, refund)
│       │   ├── ledgerApi.js      # /api/ledger (Khata, cash-in/out, payables)
│       │   ├── reportsApi.js     # /api/reports (P&L statement, daily register)
│       │   ├── agentsApi.js      # /api/agents (Staff CRUD, commission payouts)
│       │   ├── dynamicApi.js     # /api/dynamic (Dynamic specs & brand CRUD)
│       │   └── settingsApi.js    # /api/settings (Store profile & theme switcher)
│       └── ...               # Backward-compatible legacy EJS routes
│
├── frontend/                 # React.js 18 + Vite 6 + Tailwind CSS 3 SPA
│   ├── src/
│   │   ├── components/       # Reusable UI & Layout Components:
│   │   │   ├── MainLayout.jsx       # Responsive layout with collapsible sidebar
│   │   │   ├── Sidebar.jsx          # 240px -> 72px collapsible sidebar with flyout submenus
│   │   │   ├── TopModuleBar.jsx     # Quick horizontal module navigation & live clock
│   │   │   ├── Receipt80mm.jsx      # High-fidelity 80mm thermal receipt printing
│   │   │   ├── LoadingSkeleton.jsx  # Card, table, and grid loading skeletons
│   │   │   └── ConfirmModal.jsx     # Reusable confirmation dialog
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # Session state & direct login (No OTP/2FA)
│   │   │   ├── ThemeContext.jsx     # 4 switchable themes with localStorage sync
│   │   │   └── ToastContext.jsx     # Non-intrusive toast notifications
│   │   ├── pages/
│   │   │   ├── Login.jsx            # Direct username/password login
│   │   │   ├── Dashboard.jsx        # Image 2 Bizcare ERP Executive Dashboard
│   │   │   ├── PosTerminal.jsx      # Image 3 IXERSHOP POS + Image 1 Picture Grid
│   │   │   ├── OrderHistory.jsx     # Image 1 eProduct Order Management & Refunds
│   │   │   ├── ProductsInventory.jsx# Catalog table, stock adjustments & audit logs
│   │   │   ├── AccountingLedger.jsx # Customer Khata, cash-in/out, supplier payables
│   │   │   ├── Reports.jsx          # Comprehensive P&L statement, category & daily
│   │   │   ├── AgentsStaff.jsx      # Agent commissions & user staff management
│   │   │   ├── DynamicSpecs.jsx     # Dynamic brands, items, color variants & units
│   │   │   └── StoreSettings.jsx    # Store profile, tax, receipt footer & theme picker
│   │   ├── services/api.js   # Axios instance with credentials & baseURL
│   │   ├── App.jsx           # React Router DOM configuration & protected routes
│   │   └── main.jsx          # Root React entry point
│   ├── vite.config.js        # Port 3000, proxies /api, /uploads, /images to 5000
│   └── tailwind.config.js    # Theme CSS variable mappings
└── package.json              # Root orchestration (concurrently)
```

---

## 🎨 4 Switchable Visual Themes

Easily toggle between 4 tailored visual themes from the settings menu or sidebar theme cycler:
- **Bizcare Teal (Default ERP/Mart — Image 2):** Primary `#0D9488` / `#0F766E`, gradient teal header banner with background wave, crisp white cards, soft gray background `#F8FAFC`.
- **eProduct Royal Blue (Image 1):** Vibrant Royal Blue `#1D4ED8` / `#2563EB` sidebar with white pill cutout for active navigation, and floating row selection.
- **IXERSHOP Navy POS (Image 3):** Deep Navy `#0F172A` / `#1E3A8A` compact sidebar, high-contrast workspace, and color-coded action buttons.
- **Slate Dark Mode:** High-contrast dark theme for night-shift cashiers.

---

## ⚡ POS Function-Key Quick Bar (`F1` – `F10`)

The POS Terminal (`/pos`) responds to both on-screen buttons and physical keyboard shortcuts:

| Function Key | Action | Color Theme | Description |
|---|---|---|---|
| **`F1`** | **New Sale** | Navy Blue (`#1E3A8A`) | Clears cart with confirmation and initializes a fresh customer order. |
| **`F4`** | **Save & Continue** | Royal Blue (`#2563EB`) | Saves sale transaction to database without leaving the POS terminal. |
| **`F5`** | **Save & Return** | Teal (`#0891B2`) | Saves sale, prints 80mm bill, and returns to Order History. |
| **`F6`** | **Convert to AR / Khata** | Amber (`#D97706`) | Saves transaction as customer credit / accounts receivable. |
| **`F7`** | **Hold Bill** | Dark Slate (`#475569`) | Parks current bill in memory and increments held orders counter. |
| **`F10`** | **Void Order** | Crimson Red (`#DC2626`) | Cancels/clears current order items with confirmation. |
| **`F3`** | **Apply Payment** | Emerald Green CTA (`#059669`) | Finalizes sale and automatically triggers 80mm thermal receipt. |

---

## 🏃 Getting Started & Running the Project

### Prerequisites
- Node.js 18+ (Tested on Node 22)
- MongoDB running locally on `mongodb://127.0.0.1:27017/pos` (or remote cluster via `MONGO_URI`)

### 1. Development Mode (Hot-Reloading for Frontend & Backend)
Run both the Express API (Port 5000) and React Vite Dev Server (Port 3000) concurrently:
```bash
npm run dev
```
Open your browser at:
👉 **`http://localhost:3000`**

### 2. Run Backend Only
```bash
npm run server
```

### 3. Run Frontend Only
```bash
npm run client
```

### 4. Production Build & Start
Build the optimized React Vite bundle and serve it unified from the Node.js server:
```bash
npm run build
npm start
```
Open your browser at:
👉 **`http://localhost:5000`**

---

## 🔐 Default Credentials (Direct Login - No OTP/2FA)

| Role | Username | Password |
|---|---|---|
| **Administrator** | `admin` | `admin123` |
| **Cashier / Staff** | `cashier` | `cashier123` |

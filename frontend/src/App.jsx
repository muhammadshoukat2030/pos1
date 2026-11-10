import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import MainLayout from "./components/MainLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PosTerminal from "./pages/PosTerminal";
import OrderHistory from "./pages/OrderHistory";
import ProductsInventory from "./pages/ProductsInventory";
import AccountingLedger from "./pages/AccountingLedger";
import Reports from "./pages/Reports";
import AgentsStaff from "./pages/AgentsStaff";
import DynamicSpecs from "./pages/DynamicSpecs";
import StoreSettings from "./pages/StoreSettings";
import BranchesLocations from "./pages/BranchesLocations";
import BatchManagement from "./pages/BatchManagement";
import BrandManagement from "./pages/BrandManagement";
import CategoryManagement from "./pages/CategoryManagement";

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-3">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Loading POS System...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Protected ERP & POS Workspace Routes (Inside MainLayout) */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="pos" element={<PosTerminal />} />
        <Route path="orders" element={<OrderHistory />} />
        <Route path="returns" element={<OrderHistory />} />
        <Route path="products" element={<ProductsInventory />} />
        <Route path="categories" element={<CategoryManagement />} />
        <Route path="brands" element={<BrandManagement />} />
        <Route path="ledger" element={<AccountingLedger />} />
        <Route path="reports" element={<Reports />} />
        <Route path="agents" element={<AgentsStaff />} />
        <Route path="dynamic-specs" element={<DynamicSpecs />} />
        <Route path="branches" element={<Navigate to="/products" replace />} />
        <Route path="batches" element={<BatchManagement />} />
        <Route path="settings" element={<StoreSettings />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

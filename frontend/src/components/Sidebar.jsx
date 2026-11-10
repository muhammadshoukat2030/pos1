import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  PackageSearch,
  ShoppingBag,
  Receipt,
  BookOpen,
  BarChart3,
  Users2,
  SlidersHorizontal,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronDown,
  X,
  Calculator,
  CalendarClock,
  FolderTree,
  Bookmark,
  ArrowUpDown,
  RotateCcw,
  Sun,
  Moon,
  Store,
  Undo2,
  User
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Sidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, setTheme, toggleTheme, storeSettings } = useTheme();

  // Submenu states
  const [openSubmenus, setOpenSubmenus] = useState({
    products: location.pathname.startsWith("/products") || location.pathname.startsWith("/categories") || location.pathname.startsWith("/brands"),
    sales: location.pathname.startsWith("/pos") || location.pathname.startsWith("/orders") || location.pathname.startsWith("/returns")
  });

  const toggleSubmenu = (menu) => {
    if (isCollapsed) return;
    setOpenSubmenus((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const menuGroups = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/",
      exact: true
    },
    {
      title: "Products & Stock",
      icon: Package,
      key: "products",
      subItems: [
        { label: "All Products", path: "/products", icon: PackageSearch },
        { label: "Categories", path: "/categories", icon: FolderTree },
        { label: "Brands", path: "/brands", icon: Bookmark },
        { label: "Stock Adjustment", path: "/products?tab=stock", icon: ArrowUpDown },
        { label: "Company Refund", path: "/products?tab=company-refund", icon: RotateCcw }
      ]
    },
    {
      title: "Sales & POS",
      icon: ShoppingBag,
      key: "sales",
      subItems: [
        { label: "POS Terminal", path: "/pos", icon: Calculator },
        { label: "Customer Khata", path: "/khata", icon: BookOpen },
        { label: "Orders & History", path: "/orders", icon: Receipt },
        { label: "Refund / Returns", path: "/returns", icon: Undo2 }
      ]
    },
    {
      title: "Accounting / Ledger",
      icon: BookOpen,
      path: "/ledger"
    },
    {
      title: "Reports & Analytics",
      icon: BarChart3,
      path: "/reports"
    },
    {
      title: "Agents & Staff",
      icon: Users2,
      path: "/agents"
    },
    {
      title: "Dynamic Specs",
      icon: SlidersHorizontal,
      path: "/dynamic-specs"
    },
    {
      title: "Batches & Expiry",
      icon: CalendarClock,
      path: "/batches"
    },
    {
      title: "Settings",
      icon: Settings,
      path: "/settings"
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar Aside */}
      <aside
        className={`fixed top-0 left-0 h-screen z-50 transition-all duration-theme ease-in-out border-r flex flex-col justify-between
          bg-theme-sidebar text-theme-sidebarText border-theme-sidebarBorder shadow-xs
          ${isCollapsed ? "w-[80px] px-2 py-3" : "w-[234px] px-3 py-3"}
          ${isMobileOpen ? "translate-x-0 w-[234px] px-3" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Top Header & Navigation Links */}
        <div className="flex flex-col min-h-0 flex-1">
          {/* Logo & Brand Section */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-theme-sidebarBorder">
            <Link
              to="/"
              className={`flex items-center gap-2.5 overflow-hidden transition-all ${
                isCollapsed && !isMobileOpen ? "justify-center w-full" : ""
              }`}
            >
              <div className="w-8 h-8 rounded-btn bg-[#14532D] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Store className="w-4 h-4" />
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="min-w-0">
                  <h2 className="font-bold text-[13.5px] leading-tight text-theme-textPrimary truncate">
                    {storeSettings?.storeName || "Bizniz POS"}
                  </h2>
                  <span className="text-[10px] font-medium text-theme-textSecondary block truncate">
                    {storeSettings?.businessType || "Business Management"}
                  </span>
                </div>
              )}
            </Link>

            {/* Desktop Collapse Button */}
            {!isMobileOpen && (
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`hidden lg:flex items-center justify-center w-6 h-6 rounded-btn text-theme-textSecondary hover:text-theme-textPrimary hover:bg-theme-surface transition cursor-pointer ${
                  isCollapsed ? "mx-auto mt-1" : ""
                }`}
                title={isCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
              >
                <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-theme ${isCollapsed ? "rotate-180" : ""}`} />
              </button>
            )}

            {/* Mobile Close Button */}
            {isMobileOpen && (
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="lg:hidden p-1 rounded-btn text-theme-textSecondary hover:text-theme-textPrimary hover:bg-theme-surface transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick POS Terminal Button */}
          <div className="mb-2">
            <Link
              to="/pos"
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              className={`flex items-center justify-center gap-2 bg-[#14532D] hover:bg-[#104323] text-white font-semibold rounded-btn shadow-xs transition active:scale-[0.98] cursor-pointer ${
                isCollapsed && !isMobileOpen ? "w-10 h-10 mx-auto p-0" : "w-full py-2 px-3 text-xs"
              }`}
              title="Open POS Terminal (F1)"
            >
              <Calculator className="w-4 h-4 flex-shrink-0 text-white" />
              {(!isCollapsed || isMobileOpen) && <span>POS Terminal</span>}
            </Link>
          </div>

          {/* Navigation Links Scrollable List */}
          <nav className="space-y-1 overflow-y-auto flex-1 pr-0.5 py-0.5">
            {menuGroups.map((item, idx) => {
              const active = item.path ? isActive(item.path) : false;
              const hasSub = Array.isArray(item.subItems);

              if (hasSub) {
                const subActive = item.subItems.some((s) => isActive(s.path));
                const isOpen = openSubmenus[item.key];

                return (
                  <div key={idx} className="relative group">
                    <button
                      type="button"
                      onClick={() => toggleSubmenu(item.key)}
                      className={`w-full flex items-center justify-between text-left rounded-btn text-xs font-medium transition cursor-pointer ${
                        isCollapsed && !isMobileOpen
                          ? "w-10 h-10 mx-auto justify-center"
                          : "px-3 py-2"
                      } ${
                        subActive
                          ? "bg-[#14532D] text-white font-semibold shadow-xs"
                          : "text-theme-textSecondary hover:text-theme-textPrimary hover:bg-theme-surface"
                      }`}
                      title={isCollapsed ? item.title : ""}
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon className={`w-4 h-4 flex-shrink-0 ${subActive ? "text-white" : "text-theme-textSecondary group-hover:text-theme-textPrimary"}`} />
                        {(!isCollapsed || isMobileOpen) && <span className="truncate">{item.title}</span>}
                      </div>
                      {(!isCollapsed || isMobileOpen) && (
                        <ChevronDown
                          className={`w-3.5 h-3.5 ${subActive ? "text-white" : "text-theme-textSecondary"} transition-transform duration-theme ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </button>

                    {/* Collapsed Hover Flyout */}
                    {isCollapsed && !isMobileOpen && (
                      <div className="fixed left-[88px] ml-1 hidden group-hover:block z-50 bg-theme-card border border-theme-border rounded-card shadow-card p-2 w-48 animate-in fade-in duration-theme">
                        <div className="text-[10.5px] font-bold text-theme-textSecondary uppercase tracking-wider px-2.5 py-1 border-b border-theme-border mb-1">
                          {item.title}
                        </div>
                        {item.subItems.map((sub, sIdx) => (
                          <Link
                            key={sIdx}
                            to={sub.path}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-btn text-xs font-medium transition ${
                              isActive(sub.path)
                                ? "bg-[#14532D] text-white font-semibold shadow-xs"
                                : "text-theme-textPrimary hover:bg-theme-surface"
                            }`}
                          >
                            <sub.icon className={`w-3.5 h-3.5 ${isActive(sub.path) ? "text-white" : "text-theme-primary"}`} />
                            <span>{sub.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Expanded Accordion Submenu */}
                    {(!isCollapsed || isMobileOpen) && isOpen && (
                      <div className="border-l-2 border-theme-border ml-4 pl-2 my-1 space-y-0.5">
                        {item.subItems.map((sub, sIdx) => {
                          const sActive = isActive(sub.path);
                          return (
                            <Link
                              key={sIdx}
                              to={sub.path}
                              onClick={() => isMobileOpen && setIsMobileOpen(false)}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-btn text-[11.5px] font-medium transition ${
                                sActive
                                  ? "bg-[#14532D] text-white font-semibold shadow-xs"
                                  : "text-theme-textSecondary hover:text-theme-textPrimary hover:bg-theme-surface"
                              }`}
                            >
                              <sub.icon className={`w-3.5 h-3.5 ${sActive ? "text-white" : "text-theme-primary"}`} />
                              <span className="truncate">{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={idx} className="relative group">
                  <Link
                    to={item.path}
                    onClick={() => isMobileOpen && setIsMobileOpen(false)}
                    className={`flex items-center rounded-btn text-xs font-medium transition ${
                      isCollapsed && !isMobileOpen
                        ? "w-10 h-10 mx-auto justify-center"
                        : "px-3 py-2 gap-2.5"
                    } ${
                      active
                        ? "bg-[#14532D] text-white font-semibold shadow-xs"
                        : "text-theme-textSecondary hover:text-theme-textPrimary hover:bg-theme-surface"
                    }`}
                    title={isCollapsed ? item.title : ""}
                  >
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-white" : "text-theme-textSecondary group-hover:text-theme-textPrimary"}`} />
                    {(!isCollapsed || isMobileOpen) && <span className="truncate">{item.title}</span>}
                  </Link>

                  {/* Tooltip on Collapsed */}
                  {isCollapsed && !isMobileOpen && (
                    <div className="fixed left-[88px] ml-1 hidden group-hover:block z-50 bg-theme-card border border-theme-border text-theme-textPrimary text-[11px] font-medium px-2.5 py-1 rounded-btn shadow-card whitespace-nowrap pointer-events-none animate-in fade-in duration-theme">
                      {item.title}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Theme Switcher, User Profile & Logout */}
        <div className="pt-2.5 border-t border-theme-sidebarBorder space-y-2">
          {/* 1. Theme Switcher (Light / Dark Only) */}
          {(!isCollapsed || isMobileOpen) ? (
            <div className="flex items-center p-0.5 bg-theme-surface rounded-btn border border-theme-border text-xs">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-btn font-medium text-[11px] transition cursor-pointer ${
                  theme === "light"
                    ? "bg-[#14532D] text-white shadow-xs font-semibold"
                    : "text-theme-textSecondary hover:text-theme-textPrimary"
                }`}
              >
                <Sun className={`w-3.5 h-3.5 ${theme === "light" ? "text-amber-300" : "text-amber-500"}`} />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-btn font-medium text-[11px] transition cursor-pointer ${
                  theme === "dark"
                    ? "bg-[#14532D] text-white shadow-xs font-semibold"
                    : "text-theme-textSecondary hover:text-theme-textPrimary"
                }`}
              >
                <Moon className={`w-3.5 h-3.5 ${theme === "dark" ? "text-indigo-200" : "text-indigo-400"}`} />
                <span>Dark</span>
              </button>
            </div>
          ) : (
            <div className="relative group">
              <button
                type="button"
                onClick={toggleTheme}
                className="w-10 h-10 mx-auto flex items-center justify-center rounded-btn bg-theme-surface hover:bg-[#14532D] hover:text-white text-theme-textSecondary transition cursor-pointer"
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-400" />
                )}
              </button>
              <div className="fixed left-[88px] ml-1 hidden group-hover:block z-50 bg-theme-card border border-theme-border text-theme-textPrimary text-[11px] font-medium px-2.5 py-1 rounded-btn shadow-card whitespace-nowrap pointer-events-none">
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </div>
            </div>
          )}

          {/* 2. User Info & Logout Row */}
          <div className="flex items-center justify-between gap-1.5 pt-0.5">
            {(!isCollapsed || isMobileOpen) ? (
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-full bg-theme-iconBg text-theme-iconColor flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                  {user?.username?.charAt(0).toUpperCase() || <User className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-theme-textPrimary truncate capitalize leading-tight">
                    {user?.username || "Staff User"}
                  </p>
                  <p className="text-[9.5px] text-theme-textSecondary capitalize truncate leading-tight">
                    {user?.role || "Cashier"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative group mx-auto">
                <div className="w-8 h-8 rounded-full bg-theme-iconBg text-theme-iconColor flex items-center justify-center text-[11px] font-bold cursor-default">
                  {user?.username?.charAt(0).toUpperCase() || <User className="w-3.5 h-3.5" />}
                </div>
                <div className="fixed left-[88px] ml-1 hidden group-hover:block z-50 bg-theme-card border border-theme-border text-theme-textPrimary text-[11px] font-medium px-2.5 py-1 rounded-btn shadow-card whitespace-nowrap pointer-events-none">
                  {user?.username || "Staff"} ({user?.role || "User"})
                </div>
              </div>
            )}

            {/* Logout Button */}
            {(!isCollapsed || isMobileOpen) ? (
              <button
                type="button"
                onClick={logout}
                className="p-1.5 rounded-btn text-theme-textSecondary hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <div className="relative group mx-auto mt-0.5">
                <button
                  type="button"
                  onClick={logout}
                  className="w-10 h-10 flex items-center justify-center rounded-btn text-theme-textSecondary hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
                <div className="fixed left-[88px] ml-1 hidden group-hover:block z-50 bg-theme-card border border-theme-border text-theme-textPrimary text-[11px] font-medium px-2.5 py-1 rounded-btn shadow-card whitespace-nowrap pointer-events-none">
                  Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

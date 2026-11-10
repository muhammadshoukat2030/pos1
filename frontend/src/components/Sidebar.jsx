import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Boxes,
  BookOpen,
  FileBarChart,
  Users,
  Tags,
  Sliders,
  LogOut,
  ChevronLeft,
  ChevronDown,
  X,
  Palette,
  Calculator,
  PlusCircle,
  Undo2,
  ListOrdered,
  Building2,
  CalendarClock,
  FolderTree,
  Bookmark
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Sidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, setTheme, themes, storeSettings } = useTheme();

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
      icon: Boxes,
      key: "products",
      subItems: [
        { label: "All Products", path: "/products", icon: Boxes },
        { label: "Categories", path: "/categories", icon: FolderTree },
        { label: "Brands", path: "/brands", icon: Bookmark },
        { label: "Stock Adjustment", path: "/products?tab=stock", icon: PlusCircle },
        { label: "Company Refund", path: "/products?tab=company-refund", icon: Undo2 }
      ]
    },
    {
      title: "Sales & POS",
      icon: ShoppingCart,
      key: "sales",
      subItems: [
        { label: "POS Terminal", path: "/pos", icon: Calculator },
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
      icon: FileBarChart,
      path: "/reports"
    },
    {
      title: "Agents & Staff",
      icon: Users,
      path: "/agents"
    },
    {
      title: "Dynamic Specs",
      icon: Tags,
      path: "/dynamic-specs"
    },
    {
      title: "Batches & Expiry",
      icon: CalendarClock,
      path: "/batches"
    },
    {
      title: "Settings",
      icon: Sliders,
      path: "/settings"
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar Aside */}
      <aside
        className={`fixed top-0 left-0 h-screen z-50 transition-all duration-300 ease-in-out border-r flex flex-col justify-between
          ${theme === "eproduct-blue" ? "bg-[#1D4ED8] text-white border-blue-700 shadow-xl" : "bg-theme-sidebar text-theme-sidebarText border-theme-sidebarBorder shadow-sm"}
          ${isCollapsed ? "w-[72px] px-2 py-4" : "w-[240px] px-3.5 py-4"}
          ${isMobileOpen ? "translate-x-0 w-[260px] px-4" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Top Header & Logo */}
        <div>
          <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-black/5 dark:border-white/10">
            <Link
              to="/"
              className={`flex items-center gap-2.5 overflow-hidden transition-all ${
                isCollapsed && !isMobileOpen ? "justify-center w-full" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-theme-primary/10 flex items-center justify-center flex-shrink-0 border border-theme-primary/20">
                <Calculator className="w-6 h-6 text-theme-primary" />
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="min-w-0">
                  <h2 className="font-bold text-[14.5px] leading-tight truncate">
                    {storeSettings?.storeName || "Universal Mart & POS"}
                  </h2>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-theme-primary inline-block mt-0.5 uppercase tracking-wider">
                    {storeSettings?.businessType || "Super Mart / ERP"}
                  </span>
                </div>
              )}
            </Link>

            {/* Desktop Collapse Button */}
            {!isMobileOpen && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`hidden lg:flex items-center justify-center w-7 h-7 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-theme-sidebarText transition ${
                  isCollapsed ? "mx-auto mt-2" : ""
                }`}
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`} />
              </button>
            )}

            {/* Mobile Close Button */}
            {isMobileOpen && (
              <button
                onClick={() => setIsMobileOpen(false)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Quick POS Launch Button */}
          <div className="mb-3">
            <Link
              to="/pos"
              className={`flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition transform active:scale-95 ${
                isCollapsed && !isMobileOpen ? "w-11 h-11 mx-auto p-0" : "w-full py-2.5 px-3 text-[13.5px]"
              }`}
              title="Open POS Terminal (F1)"
            >
              <Calculator className="w-5 h-5 flex-shrink-0" />
              {(!isCollapsed || isMobileOpen) && <span>POS Terminal</span>}
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-270px)] pr-0.5">
            {menuGroups.map((item, idx) => {
              const active = item.path ? isActive(item.path) : false;
              const hasSub = Array.isArray(item.subItems);

              if (hasSub) {
                const subActive = item.subItems.some((s) => isActive(s.path));
                const isOpen = openSubmenus[item.key];

                return (
                  <div key={idx} className="relative group">
                    <button
                      onClick={() => toggleSubmenu(item.key)}
                      className={`w-full flex items-center justify-between text-left rounded-xl font-medium text-[13.5px] transition ${
                        isCollapsed && !isMobileOpen
                          ? "w-11 h-11 mx-auto justify-center"
                          : "px-3 py-2"
                      } ${
                        subActive
                          ? theme === "eproduct-blue"
                            ? "bg-white text-blue-700 font-bold shadow-md"
                            : "bg-theme-sidebarActive text-theme-sidebarActiveText font-semibold"
                          : "hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                      title={isCollapsed ? item.title : ""}
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        {(!isCollapsed || isMobileOpen) && <span>{item.title}</span>}
                      </div>
                      {(!isCollapsed || isMobileOpen) && (
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </button>

                    {/* Collapsed Hover Flyout */}
                    {isCollapsed && !isMobileOpen && (
                      <div className="fixed left-[72px] ml-2 hidden group-hover:block z-50 bg-theme-card border border-theme-border rounded-xl shadow-2xl p-2 w-48 animate-in fade-in slide-in-from-left-2 duration-150">
                        <div className="text-[11px] font-bold text-theme-textMuted uppercase tracking-wider px-2 py-1 border-b border-theme-border mb-1">
                          {item.title}
                        </div>
                        {item.subItems.map((sub, sIdx) => (
                          <Link
                            key={sIdx}
                            to={sub.path}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                              isActive(sub.path)
                                ? "bg-theme-primary text-white"
                                : "text-theme-textPrimary hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                          >
                            <sub.icon className="w-3.5 h-3.5" />
                            <span>{sub.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Expanded Accordion Submenu */}
                    {(!isCollapsed || isMobileOpen) && isOpen && (
                      <div className="pl-6 pr-1 pt-1 pb-1 space-y-0.5">
                        {item.subItems.map((sub, sIdx) => {
                          const sActive = isActive(sub.path);
                          return (
                            <Link
                              key={sIdx}
                              to={sub.path}
                              onClick={() => isMobileOpen && setIsMobileOpen(false)}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium transition ${
                                sActive
                                  ? theme === "eproduct-blue"
                                    ? "bg-white/20 text-white font-bold"
                                    : "bg-theme-primary/10 text-theme-primary font-semibold"
                                  : "text-theme-sidebarText/80 hover:text-theme-sidebarText hover:bg-black/5 dark:hover:bg-white/5"
                              }`}
                            >
                              <sub.icon className="w-3.5 h-3.5" />
                              <span>{sub.label}</span>
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
                    className={`flex items-center rounded-xl font-medium text-[13.5px] transition ${
                      isCollapsed && !isMobileOpen
                        ? "w-11 h-11 mx-auto justify-center"
                        : "px-3 py-2 gap-2.5"
                    } ${
                      active
                        ? theme === "eproduct-blue"
                          ? "bg-white text-blue-700 font-bold shadow-md rounded-r-none -mr-3.5 pr-5"
                          : "bg-theme-sidebarActive text-theme-sidebarActiveText font-semibold"
                        : "hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                    title={isCollapsed ? item.title : ""}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {(!isCollapsed || isMobileOpen) && <span>{item.title}</span>}
                  </Link>

                  {/* Tooltip on Collapsed */}
                  {isCollapsed && !isMobileOpen && (
                    <div className="fixed left-[72px] ml-2 hidden group-hover:block z-50 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap pointer-events-none animate-in fade-in duration-100">
                      {item.title}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Theme Cycler & Logout */}
        <div className="pt-3 border-t border-black/5 dark:border-white/10 space-y-2">
          {/* Theme Quick Switcher */}
          {(!isCollapsed || isMobileOpen) ? (
            <div className="bg-black/5 dark:bg-white/5 rounded-xl p-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-theme-textMuted uppercase mb-1.5 px-1">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-theme-primary" /> Theme Engine
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`px-2 py-1 rounded-lg font-medium text-left truncate transition flex items-center gap-1.5 ${
                      theme === t.id
                        ? "bg-theme-primary text-white shadow-sm"
                        : "bg-white/60 dark:bg-black/20 text-theme-textPrimary hover:bg-white dark:hover:bg-black/40"
                    }`}
                    title={t.name}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="truncate">{t.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="relative group">
              <button
                onClick={() => {
                  const idx = themes.findIndex((t) => t.id === theme);
                  const nextTheme = themes[(idx + 1) % themes.length];
                  setTheme(nextTheme.id);
                }}
                className="w-11 h-11 mx-auto flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5 hover:bg-theme-primary/10 text-theme-primary transition"
                title="Cycle Themes"
              >
                <Palette className="w-4 h-4" />
              </button>
              <div className="fixed left-[72px] ml-2 hidden group-hover:block z-50 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap pointer-events-none">
                Theme: {theme}
              </div>
            </div>
          )}

          {/* User Info & Logout Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={logout}
              className={`flex items-center gap-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl font-semibold text-[13px] transition ${
                isCollapsed && !isMobileOpen ? "w-11 h-11 mx-auto justify-center" : "w-full px-3 py-2"
              }`}
              title="Logout"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {(!isCollapsed || isMobileOpen) && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

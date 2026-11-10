import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  LayoutDashboard,
  Calculator,
  Receipt,
  Boxes,
  BookOpen,
  FileBarChart,
  Sliders,
  Clock,
  User,
  ShieldCheck,
  PlusCircle,
  Sun,
  Moon
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function TopModuleBar({ isCollapsed, setIsCollapsed, setIsMobileOpen }) {
  const location = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme, storeSettings } = useTheme();

  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const modules = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "POS Terminal", path: "/pos", icon: Calculator },
    { label: "Orders", path: "/orders", icon: Receipt },
    { label: "Inventory", path: "/products", icon: Boxes },
    { label: "Add Stock", path: "/products?tab=stock", icon: PlusCircle },
    { label: "Accounting / Ledger", path: "/ledger", icon: BookOpen },
    { label: "Reports", path: "/reports", icon: FileBarChart },
    { label: "Settings", path: "/settings", icon: Sliders },
  ];

  const isModuleActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-30 bg-theme-card border-b border-theme-border shadow-xs px-3 py-2 flex items-center justify-between gap-3">
      {/* Left: Mobile Hamburger & Desktop Toggle */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Mobile Hamburger */}
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="lg:hidden p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
          aria-label="Open Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Toggle Button */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg border border-theme-border hover:bg-black/5 dark:hover:bg-white/5 text-theme-textSecondary transition cursor-pointer"
          title="Toggle Sidebar (Ctrl+B)"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Middle: Horizontal Module Pills */}
      <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
        {modules.map((m, idx) => {
          const active = isModuleActive(m.path);
          return (
            <Link
              key={idx}
              to={m.path}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                active
                  ? "bg-emerald-50 dark:bg-[#133b2a] text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-300/60 dark:border-emerald-700/50 shadow-2xs"
                  : "text-theme-textSecondary hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 hover:text-emerald-800 dark:hover:text-emerald-300 border border-transparent"
              }`}
            >
              <m.icon className={`w-3.5 h-3.5 ${active ? "text-emerald-700 dark:text-emerald-400" : "text-theme-textMuted"}`} />
              <span>{m.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right: Live Clock, Theme Toggle & User Badge */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Live Clock */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-theme-textMuted bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-lg">
          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{currentTime}</span>
        </div>

        {/* Quick Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-1.5 rounded-lg border border-theme-border hover:bg-black/5 dark:hover:bg-white/10 text-theme-textSecondary transition cursor-pointer"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle Theme"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-500" />
          )}
        </button>

        {/* User Badge */}
        {user && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <div className="w-5 h-5 rounded-md bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold">
              {user.username?.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-semibold capitalize max-w-[70px] sm:max-w-[110px] truncate">
              {user.username}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

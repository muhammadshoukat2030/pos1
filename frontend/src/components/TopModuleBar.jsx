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
  PlusCircle
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function TopModuleBar({ isCollapsed, setIsCollapsed, setIsMobileOpen }) {
  const location = useLocation();
  const { user } = useAuth();
  const { storeSettings } = useTheme();

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
    <header className="sticky top-0 z-30 bg-theme-card border-b border-theme-border shadow-subtle px-3 py-2 flex items-center justify-between gap-3">
      {/* Left: Mobile Hamburger & Desktop Toggle */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Mobile Hamburger */}
        <button
          onClick={() => setIsMobileOpen(true)}
          className="lg:hidden p-2 rounded-lg bg-theme-primary/10 text-theme-primary hover:bg-theme-primary/20 transition"
          aria-label="Open Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg border border-theme-border hover:bg-black/5 dark:hover:bg-white/5 text-theme-textSecondary transition"
          title="Toggle Sidebar (Ctrl+B)"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Middle: Horizontal Module Pills (Image 2 Bizcare ERP Style) */}
      <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
        {modules.map((m, idx) => {
          const active = isModuleActive(m.path);
          return (
            <Link
              key={idx}
              to={m.path}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                active
                  ? "bg-theme-primary text-white shadow-sm"
                  : "text-theme-textSecondary hover:bg-theme-primary/10 hover:text-theme-primary"
              }`}
            >
              <m.icon className="w-3.5 h-3.5" />
              <span>{m.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right: Live Clock & User Badge */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-theme-textMuted bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full">
          <Clock className="w-3.5 h-3.5 text-theme-primary" />
          <span>{currentTime}</span>
        </div>

        {user && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-theme-primary/10 text-theme-primary border border-theme-primary/20">
            <div className="w-5 h-5 rounded-full bg-theme-primary text-white flex items-center justify-center text-[10px] font-bold">
              {user.username?.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-semibold capitalize max-w-[80px] sm:max-w-[120px] truncate">
              {user.username}
            </span>
            <span className="hidden md:inline-block text-[10px] font-bold px-1.5 py-0.2 rounded bg-theme-primary text-white uppercase tracking-wider">
              {user.role}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

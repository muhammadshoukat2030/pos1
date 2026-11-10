import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";

export default function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", isCollapsed ? "true" : "false");
  }, [isCollapsed]);

  // Global keydown shortcut Ctrl+B or Alt+S to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey && e.key.toLowerCase() === "b") || (e.altKey && e.key.toLowerCase() === "s")) {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-theme-body text-theme-textPrimary flex flex-col">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Mobile Drawer Trigger (floating so mobile devices can open sidebar without a top bar) */}
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-40 w-11 h-11 rounded-full bg-[#14532D] text-white shadow-lg flex items-center justify-center cursor-pointer hover:bg-[#104323] transition-transform active:scale-95"
        aria-label="Open Navigation Menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Main Content Area - Full Vertical Space Without Top Bar */}
      <div
        className={`flex-1 flex flex-col transition-all duration-theme ease-in-out ${
          isCollapsed ? "lg:ml-[80px]" : "lg:ml-[234px]"
        }`}
      >
        <main className="flex-1 p-3 sm:p-5 max-w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

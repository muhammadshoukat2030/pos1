import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const ThemeContext = createContext();

export const THEMES = [
  { id: "bizcare-teal", name: "Bizcare Teal (ERP / Mart)", color: "#0D9488" },
  { id: "eproduct-blue", name: "eProduct Royal Blue", color: "#2563EB" },
  { id: "ixershop-navy", name: "IXERSHOP Navy POS", color: "#0F172A" },
  { id: "slate-dark", name: "Slate Dark Mode", color: "#0284C7" },
];

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem("pos_theme") || "bizcare-teal";
  });
  const [storeSettings, setStoreSettings] = useState(null);

  const applyTheme = (themeName) => {
    document.documentElement.setAttribute("data-theme", themeName);
    if (themeName === "slate-dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("pos_theme", themeName);
    setThemeState(themeName);
  };

  const setTheme = async (newTheme) => {
    applyTheme(newTheme);
    try {
      await api.post("/settings/switch-theme", { theme: newTheme });
    } catch (e) {
      console.warn("Theme sync with backend skipped:", e.message);
    }
  };

  // Fetch store settings on mount
  const fetchSettings = async () => {
    try {
      const res = await api.get("/settings");
      if (res.data.success && res.data.settings) {
        setStoreSettings(res.data.settings);
        if (res.data.settings.activeTheme && !localStorage.getItem("pos_theme")) {
          applyTheme(res.data.settings.activeTheme);
        }
      }
    } catch (e) {
      console.warn("Could not fetch store settings:", e.message);
    }
  };

  useEffect(() => {
    applyTheme(theme);
    fetchSettings();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, changeTheme: setTheme, storeSettings, fetchSettings, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

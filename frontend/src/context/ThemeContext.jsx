import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const ThemeContext = createContext();

export const THEMES = [
  { id: "light", name: "Light Mode", color: "#059669", icon: "sun" },
  { id: "dark", name: "Dark Mode", color: "#10b981", icon: "moon" },
];

export const ThemeProvider = ({ children }) => {
  const normalizeTheme = (themeName) => {
    if (themeName === "dark" || themeName === "slate-dark") return "dark";
    return "light";
  };

  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem("pos_theme");
    return normalizeTheme(saved || "light");
  });
  const [storeSettings, setStoreSettings] = useState(null);

  const applyTheme = (themeName) => {
    const normalized = normalizeTheme(themeName);
    document.documentElement.setAttribute("data-theme", normalized);
    if (normalized === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("pos_theme", normalized);
    setThemeState(normalized);
  };

  const setTheme = async (newTheme) => {
    const normalized = normalizeTheme(newTheme);
    applyTheme(normalized);
    try {
      await api.post("/settings/switch-theme", { theme: normalized });
    } catch (e) {
      console.warn("Theme sync with backend skipped:", e.message);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
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
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        changeTheme: setTheme,
        toggleTheme,
        isDark: theme === "dark",
        storeSettings,
        fetchSettings,
        themes: THEMES
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

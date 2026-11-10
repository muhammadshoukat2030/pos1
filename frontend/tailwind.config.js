/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        theme: {
          primary: "var(--primary)",
          dark: "var(--primary-hover)",
          light: "var(--primary-light)",
          body: "var(--page-bg)",
          card: "var(--card-bg)",
          surface: "var(--surface)",
          border: "var(--border)",
          sidebar: "var(--sidebar-bg)",
          sidebarText: "var(--sidebar-text)",
          sidebarActive: "var(--active-menu-bg)",
          sidebarActiveText: "var(--active-menu-text)",
          sidebarBorder: "var(--sidebar-border)",
          textPrimary: "var(--text-primary)",
          textSecondary: "var(--text-secondary)",
          textMuted: "var(--text-secondary)",
          iconBg: "var(--icon-bg)",
          iconColor: "var(--icon-color)",
          tableHeader: "var(--table-header)",
          tableHover: "var(--table-row-hover)",
          inputBg: "var(--input-bg)",
          inputBorder: "var(--input-border)",
          placeholder: "var(--placeholder)",
          buttonPrimary: "var(--button-primary)",
          buttonHover: "var(--button-hover)",
          buttonText: "var(--button-text)",
        }
      },
      borderRadius: {
        card: "var(--card-radius, 18px)",
        btn: "var(--button-radius, 8px)",
        input: "var(--input-radius, 8px)",
        badge: "var(--badge-radius, 6px)",
      },
      boxShadow: {
        card: "var(--shadow)",
        bizniz: "var(--shadow)",
        dropdown: "0 10px 30px rgba(0, 0, 0, 0.12)",
      },
      transitionDuration: {
        theme: "var(--transition-speed, 180ms)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          "sans-serif"
        ]
      }
    },
  },
  plugins: [],
}

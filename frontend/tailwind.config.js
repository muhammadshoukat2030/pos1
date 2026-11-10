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
          primary: "var(--primary-color)",
          dark: "var(--primary-dark)",
          light: "var(--primary-light)",
          body: "var(--body-bg)",
          card: "var(--card-bg)",
          border: "var(--card-border)",
          sidebar: "var(--sidebar-bg)",
          sidebarText: "var(--sidebar-text)",
          sidebarActive: "var(--sidebar-active-bg)",
          sidebarActiveText: "var(--sidebar-active-text)",
          sidebarBorder: "var(--sidebar-border)",
          textPrimary: "var(--text-primary)",
          textSecondary: "var(--text-secondary)",
          textMuted: "var(--text-muted)",
        }
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
      },
      boxShadow: {
        subtle: "0 2px 10px rgba(0, 0, 0, 0.04)",
        card: "0 4px 20px -2px rgba(0, 0, 0, 0.06)",
        dropdown: "0 10px 30px rgba(0, 0, 0, 0.12)",
      }
    },
  },
  plugins: [],
}

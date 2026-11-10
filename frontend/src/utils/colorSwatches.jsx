import React from "react";

export const COLOR_SWATCH_MAP = {
  "pure white": "#FFFFFF",
  "snow white": "#FBFBF9",
  "bright white": "#F8FAFC",
  "off white": "#F4F0E8",
  "ash white": "#EAEAE6",
  "soft white": "#FAF7F2",
  "ivory": "#FFFDE8",
  "cream": "#FDF6D8",
  "beige": "#E8D8B8",
  "light grey": "#D1D5DB",
  "light gray": "#D1D5DB",
  "charcoal grey": "#374151",
  "charcoal gray": "#374151",
  "dark grey": "#4B5563",
  "dark gray": "#4B5563",
  "black": "#1F2937",
  "sky blue": "#7DD3FC",
  "royal blue": "#1D4ED8",
  "navy blue": "#1E3A8A",
  "bottle green": "#064E3B",
  "mint green": "#6EE7B7",
  "olive green": "#4D7C0F",
  "forest green": "#166534",
  "red": "#DC2626",
  "maroon": "#881337",
  "deep maroon": "#701A28",
  "yellow": "#FBBF24",
  "golden yellow": "#F59E0B",
  "mustard yellow": "#D97706",
  "coral peach": "#FB923C",
  "terracotta": "#C2410C",
  "rose pink": "#F43F5E",
  "dark brown": "#582F0E"
};

export const getColorHex = (product) => {
  if (!product) return "#94A3B8";
  if (product.colorHex && typeof product.colorHex === "string" && product.colorHex.startsWith("#")) {
    return product.colorHex;
  }
  const name = (product.colourName || product.colorName || "").toLowerCase().trim();
  if (COLOR_SWATCH_MAP[name]) return COLOR_SWATCH_MAP[name];

  for (const [key, hex] of Object.entries(COLOR_SWATCH_MAP)) {
    if (name && (name.includes(key) || key.includes(name))) {
      return hex;
    }
  }
  return "#CBD5E1";
};

export const getDisplayColorCode = (colorCode) => {
  if (!colorCode) return "";
  return colorCode.replace(/\s*\(sample\s*code\)/i, "").trim();
};

export const isSampleColorCode = (colorCode) => {
  if (!colorCode) return false;
  return /sample/i.test(colorCode);
};

/**
 * Reusable Color Swatch Badge Component
 */
export function ColorSwatchBadge({ product, size = "md", showName = true, showCode = true, showSampleTag = true }) {
  if (!product || (!product.colourName && !product.colorCode)) {
    return null;
  }

  const hex = getColorHex(product);
  const cleanCode = getDisplayColorCode(product.colorCode);
  const isSample = isSampleColorCode(product.colorCode) || /sample/i.test(product.customColorInfo || "");
  const isLight = ["#ffffff", "#fbfbf9", "#f8fafc", "#f4f0e8", "#fffde8", "#fdf6d8", "#eaeae6", "#faf7f2", "#e8d8b8"].includes(hex.toLowerCase());

  const dotSize = size === "sm" ? "w-2.5 h-2.5" : size === "lg" ? "w-4 h-4" : "w-3 h-3";
  const textSize = size === "sm" ? "text-[9px]" : size === "lg" ? "text-xs" : "text-[10px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-full border border-theme-border bg-theme-surface ${textSize} font-medium text-theme-textPrimary`}
      title={`${product.colourName || "Colour"} (${cleanCode || "No Code"})${isSample ? " - Sample Testing Code" : ""}`}
    >
      <span
        className={`${dotSize} rounded-full flex-shrink-0 shadow-2xs ${
          isLight ? "border border-slate-400/60 dark:border-slate-500" : "border border-black/20"
        }`}
        style={{ backgroundColor: hex }}
      />
      {showName && product.colourName && (
        <span className="font-bold text-theme-textPrimary whitespace-nowrap">
          {product.colourName}
        </span>
      )}
      {showCode && cleanCode && (
        <span className="font-mono font-bold text-theme-primary bg-theme-primary/10 px-1 py-0.2 rounded text-[9px] whitespace-nowrap">
          {cleanCode}
        </span>
      )}
      {showSampleTag && isSample && (
        <span className="text-[8px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded whitespace-nowrap">
          Sample Code
        </span>
      )}
    </span>
  );
}

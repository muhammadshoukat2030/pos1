import React, { useMemo } from "react";

// Standard Code 128 Pattern Table (Patterns 0 - 106)
// Widths of alternating 3 bars and 3 spaces (Stop pattern has 4 bars, 3 spaces)
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];

export default function Barcode128({ value = "", height = 38, width = 1.4, showText = true, className = "" }) {
  const barcodeData = useMemo(() => {
    if (!value || typeof value !== "string") return null;

    const clean = value.trim();
    if (!clean) return null;

    // Code128-B Encoding
    const codes = [104]; // Start Code B
    let checkSum = 104;

    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i) - 32;
      const validCode = code >= 0 && code <= 95 ? code : 0; // standard printable ASCII
      codes.push(validCode);
      checkSum += validCode * (i + 1);
    }

    codes.push(checkSum % 103);
    codes.push(106); // Stop Code

    // Convert pattern codes to widths
    let modules = [];
    codes.forEach((c) => {
      const pattern = CODE128_PATTERNS[c];
      if (pattern) {
        for (let j = 0; j < pattern.length; j++) {
          const w = parseInt(pattern[j], 10);
          const isBar = j % 2 === 0;
          modules.push({ width: w, isBar });
        }
      }
    });

    let totalWidth = 0;
    const rects = [];
    let currentX = 0;

    modules.forEach((m) => {
      const barWidth = m.width * width;
      if (m.isBar) {
        rects.push({ x: currentX, width: barWidth });
      }
      currentX += barWidth;
    });

    totalWidth = currentX;

    return { rects, totalWidth, cleanText: clean };
  }, [value, width]);

  if (!barcodeData) return null;

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        width={barcodeData.totalWidth}
        height={height}
        viewBox={`0 0 ${barcodeData.totalWidth} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
        className="block"
      >
        {barcodeData.rects.map((r, i) => (
          <rect key={i} x={r.x} y={0} width={r.width} height={height} fill="#000000" />
        ))}
      </svg>
      {showText && (
        <span className="font-mono text-[9px] tracking-wider text-black font-semibold mt-0.5">
          *{barcodeData.cleanText}*
        </span>
      )}
    </div>
  );
}

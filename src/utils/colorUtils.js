/**
 * Color conversion utilities
 * Convert hex colors to { rgb, text } format for rendering
 */

/**
 * Calculate luminance of a color (for determining text contrast)
 * @param {number} r - Red channel (0-255)
 * @param {number} g - Green channel (0-255)
 * @param {number} b - Blue channel (0-255)
 * @returns {number} Luminance value (0-1)
 */
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Convert hex color to RGB values
 * @param {string} hex - Hex color string (e.g., "#FF0000" or "FF0000")
 * @returns {Object|null} { r, g, b } or null if invalid
 */
function hexToRgb(hex) {
  if (!hex) return null;

  // Remove # if present
  const cleanedHex = hex.replace("#", "");

  // Validate hex format
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanedHex)) {
    return null;
  }

  const r = parseInt(cleanedHex.substring(0, 2), 16);
  const g = parseInt(cleanedHex.substring(2, 4), 16);
  const b = parseInt(cleanedHex.substring(4, 6), 16);

  return { r, g, b };
}

/**
 * Convert hex color to RGB string
 * @param {string} hex - Hex color string
 * @returns {string} RGB color string (e.g., "rgb(255, 0, 0)")
 */
function hexToRgbString(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "rgb(225, 227, 225)"; // Default gray

  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

/**
 * Determine contrasting text color (white or dark) based on background luminance
 * @param {string} hex - Hex background color
 * @returns {string} Text color as RGB string ("rgb(255, 255, 255)" for dark backgrounds, "rgb(68, 71, 70)" for light)
 */
function getContrastingTextColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "rgb(68, 71, 70)"; // Default dark gray

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);

  // Use white text for dark backgrounds (luminance < 0.5), dark text for light backgrounds
  return luminance < 0.5 ? "rgb(255, 255, 255)" : "rgb(68, 71, 70)";
}

/**
 * Convert hex color to { rgb, text } format for UI rendering
 * @param {string} hex - Hex color string (e.g., "#FF0000" or null)
 * @returns {Object} { rgb: "rgb(...)", text: "rgb(...)" }
 */
export function hexToRgbObject(hex) {
  if (!hex) {
    // Default gray when no color provided
    return {
      rgb: "rgb(225, 227, 225)", // #e1e3e1
      text: "rgb(68, 71, 70)", // #444746
    };
  }

  return {
    rgb: hexToRgbString(hex),
    text: getContrastingTextColor(hex),
  };
}

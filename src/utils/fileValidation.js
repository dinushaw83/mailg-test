// File validation utilities for attachment security

// List of risky file extensions that should be blocked
export const RISKY_FILE_EXTENSIONS = [
  // Executable files
  ".exe",
  ".bat",
  ".cmd",
  ".com",
  ".pif",
  ".scr",
  ".vbs",
  ".vbe",
  ".js",
  ".jse",
  ".wsf",
  ".wsh",
  ".msi",
  ".msp",
  ".dll",

  // Archive files that might contain executables
  ".rar",
  ".zip",
  ".7z",
  ".tar",
  ".gz",
  ".bz2",

  // Script files
  ".ps1",
  ".psm1",
  ".sh",
  ".py",
  ".pl",
  ".rb",
  ".php",
  ".asp",
  ".aspx",
  ".jsp",

  // Macro-enabled office documents
  ".xlsm",
  ".xltm",
  ".docm",
  ".dotm",
  ".pptm",
  ".potm",
  ".ppam",
  ".xlam",

  // Other potentially dangerous files
  ".app",
  ".deb",
  ".pkg",
  ".dmg",
  ".iso",
  ".img",
  ".bin",
  ".run",
  ".action",
  ".workflow",
  ".jar",
  ".class",
  ".apk",
  ".ipa",
  ".xap",
  ".cab",
  ".msu",
  ".wim",
  ".swf",
  ".air",
  ".gadget",
  ".theme",
  ".deskthemepack",
  ".themepack",
  ".scf",
  ".lnk",
  ".inf",
  ".reg",
];

// Maximum file size in bytes (25MB)
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * Check if a file extension is considered risky
 * @param {string} filename - The filename to check
 * @returns {boolean} - True if the file extension is risky
 */
export const isRiskyFileExtension = (filename) => {
  if (!filename || typeof filename !== "string") return false;

  const extension = filename.toLowerCase().substring(filename.lastIndexOf("."));
  return RISKY_FILE_EXTENSIONS.includes(extension);
};

/**
 * Check if a file is too large
 * @param {number} fileSize - The file size in bytes
 * @returns {boolean} - True if the file exceeds the size limit
 */
export const isFileTooLarge = (fileSize) => {
  return fileSize > MAX_FILE_SIZE;
};

/**
 * Validate a list of files and categorize them
 * @param {FileList|File[]} files - Array or FileList of files to validate
 * @returns {Object} - Validation result with categorized files
 */
export const validateFiles = (files) => {
  const fileArray = Array.from(files);
  const validFiles = [];
  const riskyFiles = [];
  const oversizedFiles = [];

  fileArray.forEach((file) => {
    if (isFileTooLarge(file.size)) {
      oversizedFiles.push(file);
    } else if (isRiskyFileExtension(file.name)) {
      riskyFiles.push(file);
    } else {
      validFiles.push(file);
    }
  });

  return {
    validFiles,
    riskyFiles,
    oversizedFiles,
    hasRiskyFiles: riskyFiles.length > 0,
    hasOversizedFiles: oversizedFiles.length > 0,
    hasValidFiles: validFiles.length > 0,
  };
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size string
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * Get the file extension from a filename
 * @param {string} filename - The filename
 * @returns {string} - The file extension (including the dot)
 */
export const getFileExtension = (filename) => {
  if (!filename || typeof filename !== "string") return "";

  const lastDotIndex = filename.lastIndexOf(".");
  return lastDotIndex >= 0 ? filename.substring(lastDotIndex).toLowerCase() : "";
};

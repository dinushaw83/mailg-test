// Test file for fileValidation utilities
import {
  isRiskyFileExtension,
  isFileTooLarge,
  validateFiles,
  formatFileSize,
  getFileExtension,
  MAX_FILE_SIZE,
} from "../fileValidation";

// Mock File object for testing
const createMockFile = (name, size = 1024) => ({
  name,
  size,
  type: "application/octet-stream",
});

describe("File Validation Utilities", () => {
  describe("isRiskyFileExtension", () => {
    test("should identify risky executable files", () => {
      expect(isRiskyFileExtension("malware.exe")).toBe(true);
      expect(isRiskyFileExtension("script.bat")).toBe(true);
      expect(isRiskyFileExtension("virus.scr")).toBe(true);
      expect(isRiskyFileExtension("UPPERCASE.EXE")).toBe(true);
    });

    test("should identify risky archive files", () => {
      expect(isRiskyFileExtension("archive.zip")).toBe(true);
      expect(isRiskyFileExtension("package.rar")).toBe(true);
      expect(isRiskyFileExtension("data.7z")).toBe(true);
    });

    test("should allow safe file types", () => {
      expect(isRiskyFileExtension("document.pdf")).toBe(false);
      expect(isRiskyFileExtension("image.jpg")).toBe(false);
      expect(isRiskyFileExtension("text.txt")).toBe(false);
      expect(isRiskyFileExtension("spreadsheet.xlsx")).toBe(false);
    });

    test("should handle edge cases", () => {
      expect(isRiskyFileExtension("")).toBe(false);
      expect(isRiskyFileExtension(null)).toBe(false);
      expect(isRiskyFileExtension(undefined)).toBe(false);
      expect(isRiskyFileExtension("file-without-extension")).toBe(false);
    });
  });

  describe("isFileTooLarge", () => {
    test("should identify files over 25MB as too large", () => {
      expect(isFileTooLarge(MAX_FILE_SIZE + 1)).toBe(true);
      expect(isFileTooLarge(MAX_FILE_SIZE * 2)).toBe(true);
    });

    test("should allow files under 25MB", () => {
      expect(isFileTooLarge(MAX_FILE_SIZE)).toBe(false);
      expect(isFileTooLarge(MAX_FILE_SIZE - 1)).toBe(false);
      expect(isFileTooLarge(1024)).toBe(false);
    });
  });

  describe("validateFiles", () => {
    test("should categorize files correctly", () => {
      const files = [
        createMockFile("document.pdf", 1024), // valid
        createMockFile("malware.exe", 512), // risky
        createMockFile("large-file.mp4", MAX_FILE_SIZE + 1), // oversized
        createMockFile("archive.zip", 2048), // risky
        createMockFile("image.jpg", 5120), // valid
      ];

      const result = validateFiles(files);

      expect(result.validFiles).toHaveLength(2);
      expect(result.riskyFiles).toHaveLength(2);
      expect(result.oversizedFiles).toHaveLength(1);
      expect(result.hasRiskyFiles).toBe(true);
      expect(result.hasOversizedFiles).toBe(true);
      expect(result.hasValidFiles).toBe(true);
    });

    test("should handle empty file list", () => {
      const result = validateFiles([]);

      expect(result.validFiles).toHaveLength(0);
      expect(result.riskyFiles).toHaveLength(0);
      expect(result.oversizedFiles).toHaveLength(0);
      expect(result.hasRiskyFiles).toBe(false);
      expect(result.hasOversizedFiles).toBe(false);
      expect(result.hasValidFiles).toBe(false);
    });
  });

  describe("formatFileSize", () => {
    test("should format file sizes correctly", () => {
      expect(formatFileSize(0)).toBe("0 Bytes");
      expect(formatFileSize(512)).toBe("512 Bytes");
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(1024 * 1024)).toBe("1 MB");
      expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB");
    });
  });

  describe("getFileExtension", () => {
    test("should extract file extensions correctly", () => {
      expect(getFileExtension("file.txt")).toBe(".txt");
      expect(getFileExtension("document.PDF")).toBe(".pdf");
      expect(getFileExtension("archive.tar.gz")).toBe(".gz");
      expect(getFileExtension("file-without-extension")).toBe("");
      expect(getFileExtension("")).toBe("");
    });
  });
});

// Console test output for manual verification
console.log("🧪 File Validation Test Results:");
console.log("✓ Risky .exe file:", isRiskyFileExtension("malware.exe"));
console.log("✓ Safe .pdf file:", !isRiskyFileExtension("document.pdf"));
console.log("✓ Large file detection:", isFileTooLarge(MAX_FILE_SIZE + 1));
console.log("✓ File validation complete");

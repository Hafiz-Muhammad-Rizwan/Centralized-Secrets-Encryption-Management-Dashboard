/**
 * Secure Coding Utilities
 * Project Activity 5 - Basic Secure Coding Implementation
 * 
 * Provides foundational client-side security mechanisms:
 * 1. Input sanitization & HTML escaping for XSS prevention.
 * 2. Input format, bounds, and trimming validation.
 * 3. Client-side file extension & size validation.
 * 4. Browser storage sanitization (ensuring passwords/sensitive data are never retained).
 */

/**
 * Escapes characters with syntactic meaning in HTML to prevent XSS.
 * Any user-provided string rendered through this is treated strictly as data.
 */
export function sanitizeText(str: unknown): string {
  if (typeof str !== "string") {
    if (str === null || str === undefined) return "";
    return String(str);
  }

  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Validates a text field against mandatory, character length, trimming, and pattern rules.
 */
export interface ValidationResult {
  valid: boolean;
  sanitized: string;
  errors: string[];
}

export function validateInputField(
  fieldName: string,
  rawInput: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    patternMessage?: string;
  } = {}
): ValidationResult {
  const errors: string[] = [];
  const trimmed = (rawInput ?? "").trim();

  if (options.required && trimmed.length === 0) {
    errors.push(`${fieldName} is mandatory and cannot be empty.`);
    return { valid: false, sanitized: "", errors };
  }

  if (trimmed.length > 0) {
    if (options.minLength !== undefined && trimmed.length < options.minLength) {
      errors.push(
        `${fieldName} must be at least ${options.minLength} characters (current: ${trimmed.length}).`
      );
    }

    if (options.maxLength !== undefined && trimmed.length > options.maxLength) {
      errors.push(
        `${fieldName} cannot exceed ${options.maxLength} characters (current: ${trimmed.length}).`
      );
    }

    if (options.pattern && !options.pattern.test(trimmed)) {
      errors.push(
        options.patternMessage ||
          `${fieldName} format is invalid. Unexpected characters detected.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    sanitized: trimmed,
    errors,
  };
}

/**
 * File validation result and configuration
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  fileDetails?: {
    name: string;
    size: number;
    formattedSize: string;
    extension: string;
    type: string;
  };
}

export const ALLOWED_SECRET_EXTENSIONS = [".json", ".env", ".pem", ".key", ".txt"];
export const MAX_FILE_SIZE_BYTES = 50 * 1024; // 50 KB

export function validateFileSelection(
  file: File | null | undefined,
  allowedExtensions: string[] = ALLOWED_SECRET_EXTENSIONS,
  maxSizeBytes: number = MAX_FILE_SIZE_BYTES
): FileValidationResult {
  if (!file) {
    return { valid: false, error: "No file selected. Please choose a valid file." };
  }

  const name = file.name || "";
  const lastDot = name.lastIndexOf(".");
  const ext = lastDot !== -1 ? name.slice(lastDot).toLowerCase() : "";

  // 1. Extension validation
  if (!ext || !allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file extension (${ext || "no extension"}). Only permitted formats: ${allowedExtensions.join(", ")}`,
    };
  }

  // 2. File size validation
  if (file.size > maxSizeBytes) {
    const formattedSize = (file.size / 1024).toFixed(1);
    const limitKB = (maxSizeBytes / 1024).toFixed(0);
    return {
      valid: false,
      error: `File size (${formattedSize} KB) exceeds the maximum allowed limit of ${limitKB} KB. Selection rejected.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: "Selected file is empty (0 bytes). Please select a valid configuration or credential file.",
    };
  }

  return {
    valid: true,
    fileDetails: {
      name: file.name,
      size: file.size,
      formattedSize: `${(file.size / 1024).toFixed(2)} KB`,
      extension: ext,
      type: file.type || "application/octet-stream",
    },
  };
}

/**
 * Audits and sanitizes browser storage (localStorage & sessionStorage)
 * Ensures:
 * 1. Passwords are NEVER stored in browser storage.
 * 2. Unnecessary sensitive information (plain secret keys, credentials) are removed.
 */
export function auditAndCleanBrowserStorage(): {
  cleanedKeys: string[];
  sensitiveFound: boolean;
} {
  const cleanedKeys: string[] = [];
  const sensitivePatterns = [
    /password/i,
    /secret_plain/i,
    /private_key/i,
    /auth_credential/i,
    /vaultline_secrets_records_v1/i,
  ];

  if (typeof window === "undefined") {
    return { cleanedKeys, sensitiveFound: false };
  }

  // Iterate backwards so removing an entry cannot skip the item that shifts
  // into the current index. The getter is evaluated inside the try block
  // because some privacy modes throw when `localStorage` is accessed at all.
  const cleanStorage = (label: string, getStorage: () => Storage) => {
    try {
      const storage = getStorage();
      for (let i = storage.length - 1; i >= 0; i--) {
        const key = storage.key(i);
        if (!key) continue;
        const val = storage.getItem(key) || "";

        const isSensitive = sensitivePatterns.some(
          (pattern) => pattern.test(key) || pattern.test(val)
        );

        if (isSensitive) {
          storage.removeItem(key);
          cleanedKeys.push(`${label}:${key}`);
        }
      }
    } catch {
      // Storage access might be restricted by browser policy.
    }
  };

  cleanStorage("localStorage", () => localStorage);
  cleanStorage("sessionStorage", () => sessionStorage);

  return {
    cleanedKeys,
    sensitiveFound: cleanedKeys.length > 0,
  };
}

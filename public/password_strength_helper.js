/**
 * Password Strength Helper
 * Project Activity 5 - Basic Secure Coding Implementation
 * 
 * Provides client-side evaluation of password complexity and security strength.
 * Evaluates length, letter casing, numeric digits, and special characters.
 * 
 * Returns an evaluation object:
 * - score: numeric score (0 to 4)
 * - strength: "Weak" | "Moderate" | "Strong"
 * - feedback: actionable recommendations or success message
 * - message: alias for feedback
 */

function checkPasswordStrength(password) {
  if (!password || typeof password !== "string") {
    return {
      score: 0,
      strength: "Weak",
      feedback: "Password cannot be empty. Please enter a password.",
      message: "Password cannot be empty. Please enter a password.",
    };
  }

  let score = 0;
  const missingCriteria = [];

  // 1. Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    missingCriteria.push("Use at least 8 characters");
  }

  // 2. Lowercase and Uppercase check
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  if (hasLower && hasUpper) {
    score += 1;
  } else if (!hasLower && !hasUpper) {
    missingCriteria.push("Add lowercase and uppercase letters");
  } else if (!hasLower) {
    missingCriteria.push("Add at least one lowercase letter");
  } else {
    missingCriteria.push("Add at least one uppercase letter");
  }

  // 3. Digit check
  if (/\d/.test(password)) {
    score += 1;
  } else {
    missingCriteria.push("Add at least one number (0-9)");
  }

  // 4. Special symbol check
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
    score += 1;
  } else {
    missingCriteria.push("Add at least one special symbol (!@#$%^&*)");
  }

  // Determine strength rating
  let strength = "Weak";
  if (score >= 4 && password.length >= 10) {
    strength = "Strong";
  } else if (score >= 2 && password.length >= 6) {
    strength = "Moderate";
  } else {
    strength = "Weak";
  }

  const feedback =
    missingCriteria.length > 0
      ? missingCriteria.join(". ") + "."
      : "Strong password! Meets complexity and security requirements.";

  return {
    score,
    strength,
    feedback,
    message: feedback,
  };
}

// Support browser global, ES module, and CommonJS environments
if (typeof window !== "undefined") {
  window.checkPasswordStrength = checkPasswordStrength;
}
if (typeof globalThis !== "undefined") {
  globalThis.checkPasswordStrength = checkPasswordStrength;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { checkPasswordStrength };
}

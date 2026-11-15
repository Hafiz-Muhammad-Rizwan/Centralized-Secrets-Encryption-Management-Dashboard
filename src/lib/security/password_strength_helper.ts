/**
 * Password Strength Helper
 * Project Activity 5 - Basic Secure Coding Implementation
 */

export interface PasswordStrengthResult {
  score: number;
  strength: "Weak" | "Moderate" | "Strong";
  feedback: string;
  message: string;
}

export function checkPasswordStrength(password: string): PasswordStrengthResult {
  if (typeof window !== "undefined" && typeof (window as unknown as { checkPasswordStrength?: (p: string) => PasswordStrengthResult }).checkPasswordStrength === "function") {
    return (window as unknown as { checkPasswordStrength: (p: string) => PasswordStrengthResult }).checkPasswordStrength(password);
  }

  if (!password || typeof password !== "string") {
    return {
      score: 0,
      strength: "Weak",
      feedback: "Password cannot be empty. Please enter a password.",
      message: "Password cannot be empty. Please enter a password.",
    };
  }

  let score = 0;
  const missingCriteria: string[] = [];

  if (password.length >= 8) {
    score += 1;
  } else {
    missingCriteria.push("Use at least 8 characters");
  }

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

  if (/\d/.test(password)) {
    score += 1;
  } else {
    missingCriteria.push("Add at least one number (0-9)");
  }

  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
    score += 1;
  } else {
    missingCriteria.push("Add at least one special symbol (!@#$%^&*)");
  }

  let strength: "Weak" | "Moderate" | "Strong" = "Weak";
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

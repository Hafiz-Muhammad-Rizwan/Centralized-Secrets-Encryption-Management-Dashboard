/**
 * Password Strength Helper
 * Project Activity 5 - Basic Secure Coding Implementation
 *
 * Calls the instructor-provided `checkPasswordStrength` function loaded from
 * `/password_strength_helper.js`. The helper itself is not reimplemented here.
 */

export interface PasswordStrengthResult {
  score: number;
  strength: "Weak" | "Moderate" | "Strong";
  feedback: string;
  message: string;
}

type BrowserHelper = (password: string) => PasswordStrengthResult;

export function checkPasswordStrength(password: string): PasswordStrengthResult {
  if (typeof window !== "undefined") {
    const helper = (window as unknown as { checkPasswordStrength?: BrowserHelper }).checkPasswordStrength;
    if (typeof helper === "function") return helper(password);
  }

  // Server render before the deferred helper script runs. Passwords start empty,
  // so a neutral result is expected until the browser evaluates the input.
  return {
    score: 0,
    strength: "Weak",
    feedback: "Password strength will be evaluated in the browser as you type.",
    message: "Password strength will be evaluated in the browser as you type.",
  };
}

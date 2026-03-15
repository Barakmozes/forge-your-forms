// ============================================
// Password Validation — strength checks for signup and password reset
// Import and call validatePassword() before supabase.auth.signUp() or updateUser()
// ============================================

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export const PASSWORD_MIN_LENGTH = 8;

/**
 * Validates password strength.
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 *
 * Usage in Auth.tsx signup handler:
 *   import { validatePassword } from "@/lib/passwordValidation";
 *   const validation = validatePassword(password);
 *   if (!validation.valid) {
 *     toast({ title: "Weak password", description: validation.errors.join(" "), variant: "destructive" });
 *     setLoading(false);
 *     return;
 *   }
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`At least ${PASSWORD_MIN_LENGTH} characters required.`);
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("At least one uppercase letter required.");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("At least one lowercase letter required.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("At least one number required.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("At least one special character required.");
  }

  return { valid: errors.length === 0, errors };
}

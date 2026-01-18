/*
 * InputValidator - shared validators for user input (email, password)
 * - Provides safe, reusable validation utilities without logging sensitive values
 */

export interface PasswordPolicy {
  minLength?: number; // default 8
  maxLength?: number; // optional hard cap, default 128
  requireUppercase?: boolean; // default true
  requireLowercase?: boolean; // default true
  requireNumber?: boolean; // default true
  requireSymbol?: boolean; // default true
  // Optional: disallow common passwords list (placeholder hook)
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const DEFAULT_POLICY: Required<PasswordPolicy> = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true,
};

export class InputValidator {
  // Normalize and validate email using a pragmatic pattern (not full RFC 5322, but robust)
  static normalizeEmail(raw: string): string {
    return (raw || '').trim().toLowerCase();
  }

  static isValidEmail(email: string): boolean {
    if (!email) return false;
    // Simple robust regex: local@domain.tld with basic constraints
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return re.test(email);
  }

  static validatePassword(password: string, policy?: PasswordPolicy): ValidationResult {
    const cfg = { ...DEFAULT_POLICY, ...(policy || {}) } as Required<PasswordPolicy>;
    const errors: string[] = [];

    if (typeof password !== 'string') {
      return { valid: false, errors: ['Password must be a string'] };
    }

    if (password.length < cfg.minLength) {
      errors.push(`Password must be at least ${cfg.minLength} characters long`);
    }

    if (cfg.maxLength && password.length > cfg.maxLength) {
      errors.push(`Password must be at most ${cfg.maxLength} characters long`);
    }

    if (cfg.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (cfg.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (cfg.requireNumber && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (cfg.requireSymbol && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
      errors.push('Password must contain at least one symbol');
    }

    return { valid: errors.length === 0, errors };
  }
}

export default InputValidator;

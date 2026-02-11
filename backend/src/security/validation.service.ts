/**
 * Input validation utilities for signup/login flows.
 * - Email format validation (basic RFC compliant) and normalization
 * - Password strength validation (delegates to password.service)
 */

import { DEFAULT_PASSWORD_POLICY, PasswordPolicy, PasswordValidationResult, validatePasswordStrength } from './password.service';

export interface EmailValidationResult {
  valid: boolean;
  normalized?: string; // lowercased and trimmed
  error?: string; // if invalid, contains error key
}

// Basic email regex derived from RFC 5322 (practical subset), avoiding catastrophic backtracking
// This is intentionally permissive but safe for application-level validation.
const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export function normalizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): EmailValidationResult {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return { valid: false, error: 'email.required' };
  }
  if (!EMAIL_REGEX.test(normalized)) {
    return { valid: false, error: 'email.invalid_format' };
  }
  return { valid: true, normalized };
}

export function validatePassword(password: string, policy?: PasswordPolicy): PasswordValidationResult {
  return validatePasswordStrength(password, policy ?? DEFAULT_PASSWORD_POLICY);
}

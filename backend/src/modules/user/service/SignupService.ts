// SignupService - orchestrates validation, hashing, and persistence
// IMPORTANT: Never log or return sensitive info (passwords, hashes, salts, tokens)

import { InputValidator } from '../../../core/validation';
import { PasswordService } from '../../../core/security';
import { IUserRepository } from '../repository/UserRepository';
import type { SignupRequestDTO, SignupResponseDTO } from '../domain/dto/SignupDTO';

export class SignupService {
  constructor(private readonly users: IUserRepository, private readonly passwordSvc: PasswordService = new PasswordService()) {}

  async signup(payload: SignupRequestDTO): Promise<SignupResponseDTO> {
    // 1) Normalize & validate input
    const email = InputValidator.normalizeEmail(payload?.email || '');
    const password = payload?.password ?? '';

    const errors: string[] = [];

    if (!email) errors.push('email is required');
    if (!password) errors.push('password is required');

    if (email && !InputValidator.isValidEmail(email)) {
      errors.push('invalid email format');
    }

    const pwdValidation = InputValidator.validatePassword(password);
    if (!pwdValidation.valid) {
      errors.push(...pwdValidation.errors);
    }

    if (errors.length > 0) {
      const err: any = new Error('Validation error');
      err.code = 'BAD_REQUEST';
      err.details = errors;
      throw err;
    }

    // 2) Check uniqueness (best-effort prior to insert)
    try {
      const existing = await this.users.findByEmail(email);
      if (existing) {
        const err: any = new Error('Email already registered');
        err.code = 'CONFLICT';
        throw err;
      }
    } catch (e: any) {
      // If repository throws a not-implemented or other, rethrow unless it is our conflict
      if (e?.code === 'CONFLICT') throw e;
      // else continue to insertion which will rely on DB unique constraint as ultimate guard
    }

    // 3) Hash password
    const { hash: passwordHash, salt } = await this.passwordSvc.hash(password);

    // 4) Persist user
    let record;
    try {
      record = await this.users.create({
        email,
        passwordHash,
        salt,
        status: 'ACTIVE',
      });
    } catch (e: any) {
      // Map unique violation and generic errors
      const message = (e?.message || '').toLowerCase();
      if (e?.code === 'P2002' || message.includes('unique') || message.includes('duplicate')) {
        const err: any = new Error('Email already registered');
        err.code = 'CONFLICT';
        throw err;
      }
      const err: any = new Error('Internal error');
      err.code = 'INTERNAL';
      throw err;
    }

    // 5) Build safe response
    const resp: SignupResponseDTO = {
      id: record.id,
      email: record.email,
      status: record.status,
      createdAt: new Date(record.created_at).toISOString(),
      updatedAt: new Date(record.updated_at).toISOString(),
    };

    return resp;
  }
}

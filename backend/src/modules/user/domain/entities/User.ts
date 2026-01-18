// Domain entity for User - align with Prisma model
// IMPORTANT: Do not log sensitive fields

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  SUSPENDED = 'SUSPENDED',
  DISABLED = 'DISABLED',
}

export interface UserProps {
  id: string;
  email: string;
  passwordHash: string; // never log
  salt?: string | null; // never log
  createdAt: Date;
  updatedAt: Date;
  status: AccountStatus;
  verificationToken?: string | null; // never log
  verificationExpiresAt?: Date | null;
}

export class User implements UserProps {
  id: string;
  email: string;
  passwordHash: string;
  salt?: string | null;
  createdAt: Date;
  updatedAt: Date;
  status: AccountStatus;
  verificationToken?: string | null;
  verificationExpiresAt?: Date | null;

  private constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.salt = props.salt ?? null;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.status = props.status;
    this.verificationToken = props.verificationToken ?? null;
    this.verificationExpiresAt = props.verificationExpiresAt ?? null;
  }

  static fromPersistence(record: any): User {
    return new User({
      id: record.id,
      email: record.email,
      passwordHash: record.passwordHash ?? record.password_hash,
      salt: record.salt ?? null,
      createdAt: new Date(record.createdAt ?? record.created_at),
      updatedAt: new Date(record.updatedAt ?? record.updated_at),
      status: record.status as AccountStatus,
      verificationToken: record.verificationToken ?? record.verification_token ?? null,
      verificationExpiresAt: record.verificationExpiresAt
        ? new Date(record.verificationExpiresAt)
        : record.verification_expires_at
        ? new Date(record.verification_expires_at)
        : null,
    });
  }

  toJSONSafe() {
    return {
      id: this.id,
      email: this.email,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      status: this.status,
      // intentionally exclude passwordHash, salt, verificationToken, verificationExpiresAt
    };
  }
}

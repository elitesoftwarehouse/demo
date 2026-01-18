// DTOs for signup flow - keep only non-sensitive data in outputs

export interface SignupRequestDTO {
  email: string;
  password: string;
}

export interface SignupResponseDTO {
  id: string;
  email: string;
  status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'DISABLED';
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

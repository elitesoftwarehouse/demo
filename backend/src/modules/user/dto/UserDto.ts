// Public DTO for User - safe to return via API (no sensitive fields)

export type UserDto = {
  id: string;
  email: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'DISABLED';
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

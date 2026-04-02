export type UserRole = 'student' | 'admin';

export type UserStatus = 'active' | 'suspended' | 'banned';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

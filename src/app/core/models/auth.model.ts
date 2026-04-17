export type Role = 'ADMIN' | 'GERENTE' | 'COLABORADOR';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

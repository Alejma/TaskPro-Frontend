import { Role } from './auth.model';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface UserPayload {
  name: string;
  email: string;
  password?: string;
  roleName: Role;
  active?: boolean;
}

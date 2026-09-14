import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  phone: string;
  role: Role;
}

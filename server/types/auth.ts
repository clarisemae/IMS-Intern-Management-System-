export type UserRole = "admin" | "supervisor" | "intern";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department: string | null;
  birthdate: string | null;
}

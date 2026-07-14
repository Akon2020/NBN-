// BACK-G02 : catalogue de rôles (table `roles`), plus un ENUM figé.
export type RoleEnum =
  | "admin"
  | "communication"
  | "marketing"
  | "operations"
  | "technologique"
  | "juridique"
  | "tresorerie"
  | "commissionnaire"
  | "consultant"
  | "agent";
export type StatusEnum = "ACTIVE" | "INACTIVE";

export interface User {
  idUser: number;
  fullName: string;
  email: string;
  role: RoleEnum;
  avatar: string;
  status: StatusEnum;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthPayload {
  email: string;
  password: string;
}

export interface Data {
  token: string;
  refreshToken: string;
  userInfo: User;
}

export interface Auth {
  message: string;
  data: Data;
}

export interface Permission {
  idPermission: number;
  key: string;
  description: string | null;
}

export interface AccessGrant {
  idAccessGrant: number;
  idUser: number;
  permissionKey: string;
  grantedBy: number;
  grantedAt: string;
  expiresAt: string | null;
  reason: string;
  revokedAt: string | null;
  revokedBy: number | null;
}

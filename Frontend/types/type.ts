export type RoleEnum = "admin" | "agent" | "consultant";
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
  userInfo: User;
}

export interface Auth {
  message: string;
  data: Data;
}

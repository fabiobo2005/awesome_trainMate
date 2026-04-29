import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type AuthTokenPayload = {
  sub: string;
  role: "STUDENT" | "TRAINER" | "ADMIN";
  email: string;
};

export function signAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"]
  });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === "string" || !decoded.sub || !decoded.role || !decoded.email) {
    throw new Error("Invalid token payload");
  }

  const role = String(decoded.role).toUpperCase();
  if (role !== "STUDENT" && role !== "TRAINER" && role !== "ADMIN") {
    throw new Error("Invalid token role");
  }

  return {
    sub: String(decoded.sub),
    role,
    email: String(decoded.email)
  };
}


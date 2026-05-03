import type { Request, Response, NextFunction } from "express";
import { jwtVerify } from "jose";
import { logger } from "../lib/logger";

export interface AuthUser {
  id: string;
  email: string;
  role: "ADMIN" | "USER";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const SUPABASE_JWT_SECRET = process.env["SUPABASE_JWT_SECRET"];

// Accept SUPABASE_URL or fall back to VITE_SUPABASE_URL (same secret, both
// are global Replit secrets available to every service in the workspace).
const SUPABASE_URL =
  process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];

// Supabase issues JWTs with issuer = <project-url>/auth/v1
const EXPECTED_ISSUER = SUPABASE_URL ? `${SUPABASE_URL}/auth/v1` : undefined;

if (!EXPECTED_ISSUER) {
  logger.warn(
    "Neither SUPABASE_URL nor VITE_SUPABASE_URL is set — " +
    "JWT issuer validation is disabled. Set one of these to harden auth.",
  );
}

function getJwtSecret(): Uint8Array {
  if (!SUPABASE_JWT_SECRET) {
    throw new Error(
      "SUPABASE_JWT_SECRET environment variable is required for JWT verification.",
    );
  }
  return new TextEncoder().encode(SUPABASE_JWT_SECRET);
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
      // Validate issuer when SUPABASE_URL is available, fail-closed on mismatch
      ...(EXPECTED_ISSUER ? { issuer: EXPECTED_ISSUER } : {}),
    });

    const sub = payload.sub;
    if (!sub) {
      res.status(401).json({ error: "Invalid token: missing subject claim" });
      return;
    }

    const email = (payload["email"] as string) ?? "";

    const appMetadata = (payload["app_metadata"] as Record<string, unknown>) ?? {};
    const userMetadata = (payload["user_metadata"] as Record<string, unknown>) ?? {};
    const rawRole =
      appMetadata["user_role"] ??
      appMetadata["role"] ??
      payload["user_role"] ??
      userMetadata["user_role"] ??
      userMetadata["role"];
    const role: AuthUser["role"] = rawRole === "ADMIN" ? "ADMIN" : "USER";

    req.user = { id: sub, email, role };
    next();
  } catch (err) {
    logger.warn({ err }, "[requireAuth] JWT verification failed");
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(minimumRole: "ADMIN" | "USER") {
  const roleHierarchy: Record<AuthUser["role"], number> = {
    USER: 1,
    ADMIN: 2,
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }

    const userLevel = roleHierarchy[req.user.role] ?? 0;
    const requiredLevel = roleHierarchy[minimumRole] ?? 999;

    if (userLevel < requiredLevel) {
      res.status(403).json({
        error: `Insufficient role: requires ${minimumRole}, got ${req.user.role}`,
      });
      return;
    }

    next();
  };
}

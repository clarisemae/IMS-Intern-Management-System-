import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "../config/db";
import { AuthUser, UserRole } from "../types/auth";

interface JwtPayload {
  userId: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization token is required." });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET ?? "change_this_secret_in_local_dev",
    ) as JwtPayload;

    const [rows] = await db.query(
      `SELECT id, full_name, email, role, department, birthdate
       FROM users
       WHERE id = ? AND status = 'active'
       LIMIT 1`,
      [decoded.userId],
    );

    const user = (rows as any[])[0];

    if (!user) {
      return res.status(401).json({ message: "User account is not available." });
    }

    req.user = {
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: user.role,
      department: user.department,
      birthdate: user.birthdate,
    };

    next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication is required." });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to perform this action." });
    }

    next();
  };
}

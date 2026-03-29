import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "../config/db";
import { comparePassword } from "../utils/password";

function createToken(userId: number) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET ?? "change_this_secret_in_local_dev",
    { expiresIn: "8h" },
  );
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const [rows] = await db.query(
    `SELECT id, full_name, email, password_hash, role, department, birthdate, status
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email],
  );

  const user = (rows as any[])[0];

  if (!user || user.status !== "active") {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const passwordMatches = await comparePassword(password, user.password_hash);

  if (!passwordMatches) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  return res.json({
    token: createToken(user.id),
    user: {
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: user.role,
      department: user.department,
      birthdate: user.birthdate,
    },
  });
}

export async function me(req: Request, res: Response) {
  return res.json({ user: req.user });
}

export async function logout(_req: Request, res: Response) {
  return res.json({ message: "Logged out successfully." });
}

import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "../config/db";
import { comparePassword, hashPassword } from "../utils/password";

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

export async function updateProfile(req: Request, res: Response) {
  const userId = req.user?.id;
  const {
    name,
    email,
    department,
    birthdate,
    password,
  } = req.body ?? {};

  if (!userId) {
    return res.status(401).json({ message: "Authentication is required." });
  }

  if (!name || !email) {
    return res.status(400).json({ message: "Name and email are required." });
  }

  try {
    if (password) {
      const passwordHash = await hashPassword(password);
      await db.execute(
        `UPDATE users
         SET full_name = ?, email = ?, department = ?, birthdate = ?, password_hash = ?
         WHERE id = ?`,
        [name, email, department || null, birthdate || null, passwordHash, userId],
      );
    } else {
      await db.execute(
        `UPDATE users
         SET full_name = ?, email = ?, department = ?, birthdate = ?
         WHERE id = ?`,
        [name, email, department || null, birthdate || null, userId],
      );
    }
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "A user with that email already exists." });
    }

    throw error;
  }

  const [rows] = await db.query(
    `SELECT id, full_name, email, role, department, birthdate
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId],
  );

  const updatedUser = (rows as any[])[0];

  if (!updatedUser) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json({
    user: {
      id: updatedUser.id,
      name: updatedUser.full_name,
      email: updatedUser.email,
      role: updatedUser.role,
      department: updatedUser.department,
      birthdate: updatedUser.birthdate,
    },
  });
}

export async function logout(_req: Request, res: Response) {
  return res.json({ message: "Logged out successfully." });
}

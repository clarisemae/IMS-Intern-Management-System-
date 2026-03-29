import { Request, Response } from "express";
import { ResultSetHeader } from "mysql2";
import { db } from "../config/db";
import { getUserSchedule, saveUserSchedule } from "../utils/schedule";
import { hashPassword } from "../utils/password";

async function mapUserRow(row: any) {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    role: row.role,
    status: row.status,
    department: row.department,
    joinDate: row.created_at,
    birthdate: row.birthdate,
    schedule: row.role === "intern" ? await getUserSchedule(row.id) : [],
  };
}

export async function getUsers(_req: Request, res: Response) {
  const [rows] = await db.query(
    `SELECT id, full_name, email, role, status, department, birthdate, created_at
     FROM users
     ORDER BY created_at DESC, id DESC`,
  );

  return res.json({
    users: await Promise.all((rows as any[]).map(mapUserRow)),
  });
}

export async function createUser(req: Request, res: Response) {
  const {
    name,
    email,
    password,
    role,
    department,
    birthdate,
    status,
    schedule,
  } = req.body ?? {};

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "Name, email, password, and role are required." });
  }

  const passwordHash = await hashPassword(password);

  try {
    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (full_name, email, password_hash, role, department, birthdate, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        passwordHash,
        role,
        department || null,
        birthdate || null,
        status || "active",
      ],
    );

    if (role === "intern" && Array.isArray(schedule)) {
      await saveUserSchedule(result.insertId, schedule);
    }

    const [rows] = await db.query(
      `SELECT id, full_name, email, role, status, department, birthdate, created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [result.insertId],
    );

    return res.status(201).json({
      user: await mapUserRow((rows as any[])[0]),
    });
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "A user with that email already exists." });
    }

    throw error;
  }
}

export async function updateUser(req: Request, res: Response) {
  const userId = Number(req.params.id);
  const {
    name,
    email,
    role,
    department,
    birthdate,
    status,
    password,
    schedule,
  } = req.body ?? {};

  if (!userId) {
    return res.status(400).json({ message: "A valid user id is required." });
  }

  if (!name || !email || !role || !status) {
    return res.status(400).json({ message: "Name, email, role, and status are required." });
  }

  if (req.user?.id === userId && status !== "active") {
    return res.status(400).json({ message: "You cannot deactivate your own account." });
  }

  try {
    if (password) {
      const passwordHash = await hashPassword(password);
      await db.execute(
        `UPDATE users
         SET full_name = ?, email = ?, role = ?, department = ?, birthdate = ?, status = ?, password_hash = ?
         WHERE id = ?`,
        [name, email, role, department || null, birthdate || null, status, passwordHash, userId],
      );
    } else {
      await db.execute(
        `UPDATE users
         SET full_name = ?, email = ?, role = ?, department = ?, birthdate = ?, status = ?
         WHERE id = ?`,
        [name, email, role, department || null, birthdate || null, status, userId],
      );
    }

    if (role === "intern" && Array.isArray(schedule)) {
      await saveUserSchedule(userId, schedule);
    }
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "A user with that email already exists." });
    }

    throw error;
  }

  const [rows] = await db.query(
    `SELECT id, full_name, email, role, status, department, birthdate, created_at
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
    user: await mapUserRow(updatedUser),
  });
}

export async function deleteUser(req: Request, res: Response) {
  const userId = Number(req.params.id);

  if (!userId) {
    return res.status(400).json({ message: "A valid user id is required." });
  }

  if (req.user?.id === userId) {
    return res.status(400).json({ message: "You cannot delete your own account." });
  }

  await db.execute("DELETE FROM users WHERE id = ?", [userId]);

  return res.json({ message: "User deleted successfully." });
}

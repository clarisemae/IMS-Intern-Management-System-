import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "../config/db";
import { comparePassword, hashPassword } from "../utils/password";
import { sendPasswordResetOtpEmail } from "../utils/mailer";

const PASSWORD_RESET_OTP_TTL_MINUTES = 10;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isStrongPassword(password: string) {
  return password.length >= 8;
}

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

export async function forgotPassword(req: Request, res: Response) {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  const [rows] = await db.query(
    `SELECT id, email, status
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email],
  );

  const user = (rows as any[])[0];

  if (!user || user.status !== "active") {
    return res.json({
      message: "If that email exists in the system, an OTP has been sent.",
    });
  }

  const otp = generateOtp();
  const otpHash = await hashPassword(otp);

  await db.execute(
    `UPDATE password_reset_otps
     SET used_at = NOW()
     WHERE user_id = ? AND used_at IS NULL`,
    [user.id],
  );

  await db.execute(
    `INSERT INTO password_reset_otps (user_id, otp_hash, expires_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [user.id, otpHash, PASSWORD_RESET_OTP_TTL_MINUTES],
  );

  await sendPasswordResetOtpEmail(user.email, otp);

  return res.json({
    message: "If that email exists in the system, an OTP has been sent.",
  });
}

export async function resetPassword(req: Request, res: Response) {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";
  const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: "Email, OTP, and new password are required." });
  }

  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({ message: "Password must be at least 8 characters long." });
  }

  const [userRows] = await db.query(
    `SELECT id, status
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email],
  );

  const user = (userRows as any[])[0];

  if (!user || user.status !== "active") {
    return res.status(400).json({ message: "Invalid or expired reset code." });
  }

  const [otpRows] = await db.query(
    `SELECT id, otp_hash, expires_at, attempts
     FROM password_reset_otps
     WHERE user_id = ?
       AND used_at IS NULL
       AND expires_at >= NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [user.id],
  );

  const resetOtp = (otpRows as any[])[0];

  if (!resetOtp) {
    return res.status(400).json({ message: "Invalid or expired reset code." });
  }

  if (resetOtp.attempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
    await db.execute(
      `UPDATE password_reset_otps
       SET used_at = NOW()
       WHERE id = ?`,
      [resetOtp.id],
    );

    return res.status(400).json({ message: "This reset code has expired. Please request a new OTP." });
  }

  const matches = await comparePassword(otp, resetOtp.otp_hash);

  if (!matches) {
    await db.execute(
      `UPDATE password_reset_otps
       SET attempts = attempts + 1
       WHERE id = ?`,
      [resetOtp.id],
    );

    return res.status(400).json({ message: "Invalid or expired reset code." });
  }

  const passwordHash = await hashPassword(newPassword);

  await db.execute(
    `UPDATE users
     SET password_hash = ?
     WHERE id = ?`,
    [passwordHash, user.id],
  );

  await db.execute(
    `UPDATE password_reset_otps
     SET used_at = NOW()
     WHERE user_id = ? AND used_at IS NULL`,
    [user.id],
  );

  return res.json({ message: "Password reset successful. You can now sign in." });
}

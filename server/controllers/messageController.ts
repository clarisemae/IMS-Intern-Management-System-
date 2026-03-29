import { Request, Response } from "express";
import { ResultSetHeader } from "mysql2";
import { db } from "../config/db";

function formatRelativeTime(input: Date | string | null) {
  if (!input) return "just now";
  const date = new Date(input);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export async function getConversations(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication is required." });
  }

  const [rows] = await db.query(
    `SELECT
       u.id,
       u.full_name,
       u.role,
       m.content AS last_message,
       m.created_at,
       (
         SELECT COUNT(*)
         FROM messages unread
         WHERE unread.sender_id = u.id
           AND unread.receiver_id = ?
           AND unread.is_read = 0
       ) AS unread
     FROM users u
     LEFT JOIN messages m ON m.id = (
       SELECT latest.id
       FROM messages latest
       WHERE (latest.sender_id = ? AND latest.receiver_id = u.id)
          OR (latest.sender_id = u.id AND latest.receiver_id = ?)
       ORDER BY latest.created_at DESC
       LIMIT 1
     )
     WHERE u.id <> ? AND u.status = 'active'
     ORDER BY m.created_at DESC, u.full_name ASC`,
    [req.user.id, req.user.id, req.user.id, req.user.id],
  );

  return res.json({
    conversations: (rows as any[]).map((row) => ({
      id: row.id,
      name: row.full_name,
      role: row.role.charAt(0).toUpperCase() + row.role.slice(1),
      lastMessage: row.last_message ?? "No messages yet",
      timestamp: row.created_at ? formatRelativeTime(row.created_at) : "",
      unread: Number(row.unread ?? 0),
      online: false,
    })),
  });
}

export async function getConversationMessages(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication is required." });
  }

  const otherUserId = Number(req.params.userId);

  if (!otherUserId) {
    return res.status(400).json({ message: "A valid user id is required." });
  }

  const [userRows] = await db.query(
    `SELECT id, full_name, role
     FROM users
     WHERE id = ? AND status = 'active'
     LIMIT 1`,
    [otherUserId],
  );

  const otherUser = (userRows as any[])[0];

  if (!otherUser) {
    return res.status(404).json({ message: "Conversation user not found." });
  }

  await db.execute(
    `UPDATE messages
     SET is_read = 1
     WHERE sender_id = ? AND receiver_id = ? AND is_read = 0`,
    [otherUserId, req.user.id],
  );

  const [rows] = await db.query(
    `SELECT
       m.id,
       m.sender_id,
       sender.full_name AS sender_name,
       m.content,
       m.created_at,
       m.is_read
     FROM messages m
     INNER JOIN users sender ON sender.id = m.sender_id
     WHERE (m.sender_id = ? AND m.receiver_id = ?)
        OR (m.sender_id = ? AND m.receiver_id = ?)
     ORDER BY m.created_at ASC`,
    [req.user.id, otherUserId, otherUserId, req.user.id],
  );

  return res.json({
    conversation: {
      id: otherUser.id,
      name: otherUser.full_name,
      role: otherUser.role.charAt(0).toUpperCase() + otherUser.role.slice(1),
      online: false,
    },
    messages: (rows as any[]).map((row) => ({
      id: row.id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      content: row.content,
      timestamp: row.created_at,
      read: Boolean(row.is_read),
    })),
  });
}

export async function sendMessage(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication is required." });
  }

  const { receiverId, content } = req.body ?? {};

  if (!receiverId || !content?.trim()) {
    return res.status(400).json({ message: "Receiver and message content are required." });
  }

  const [userRows] = await db.query(
    `SELECT id
     FROM users
     WHERE id = ? AND status = 'active'
     LIMIT 1`,
    [receiverId],
  );

  if (!(userRows as any[])[0]) {
    return res.status(404).json({ message: "Message recipient not found." });
  }

  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO messages (sender_id, receiver_id, content, is_read)
     VALUES (?, ?, ?, 0)`,
    [req.user.id, receiverId, content.trim()],
  );

  const [rows] = await db.query(
    `SELECT
       m.id,
       m.sender_id,
       sender.full_name AS sender_name,
       m.content,
       m.created_at,
       m.is_read
     FROM messages m
     INNER JOIN users sender ON sender.id = m.sender_id
     WHERE m.id = ?
     LIMIT 1`,
    [result.insertId],
  );

  const message = (rows as any[])[0];

  return res.status(201).json({
    message: {
      id: message.id,
      senderId: message.sender_id,
      senderName: message.sender_name,
      content: message.content,
      timestamp: message.created_at,
      read: Boolean(message.is_read),
    },
  });
}

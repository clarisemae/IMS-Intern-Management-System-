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

function normalizeAttachment(attachment: unknown) {
  if (!attachment) {
    return { value: null as null | { name: string; type: string; data: string } };
  }

  if (
    typeof attachment !== "object" ||
    attachment === null ||
    typeof (attachment as any).name !== "string" ||
    typeof (attachment as any).type !== "string" ||
    typeof (attachment as any).data !== "string"
  ) {
    return { error: "Attachment data is invalid." };
  }

  const normalized = {
    name: (attachment as any).name.trim(),
    type: (attachment as any).type.trim(),
    data: (attachment as any).data.trim(),
  };

  if (!normalized.name || !normalized.type || !normalized.data) {
    return { error: "Attachment data is incomplete." };
  }

  if (normalized.name.length > 255) {
    return { error: "Attachment file name is too long." };
  }

  const isSupportedData = /^data:[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+;base64,[A-Za-z0-9+/=]+$/i.test(normalized.data);

  if (!isSupportedData) {
    return { error: "Attachment data must be a valid base64 data URL." };
  }

  if (normalized.data.length > 7_000_000) {
    return { error: "Attachment is too large. Please upload a smaller file." };
  }

  return { value: normalized };
}

function getConversationPreview(row: any) {
  if (row.last_message?.trim()) {
    return row.last_message;
  }

  if (row.attachment_name) {
    return `Sent an attachment: ${row.attachment_name}`;
  }

  return "No messages yet";
}

function mapMessageRow(row: any) {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    content: row.content,
    timestamp: row.created_at,
    read: Boolean(row.is_read),
    attachment: row.attachment_name
      ? {
          name: row.attachment_name,
          type: row.attachment_type,
          data: row.attachment_data,
        }
      : null,
  };
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
       m.attachment_name,
       m.created_at,
       (
         SELECT COUNT(*)
         FROM messages unread
         WHERE unread.sender_id = u.id
           AND unread.receiver_id = ?
           AND unread.is_read = 0
       ) AS unread,
       EXISTS (
         SELECT 1
         FROM message_favorites mf
         WHERE mf.user_id = ?
           AND mf.favorite_user_id = u.id
       ) AS favorite
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
     ORDER BY favorite DESC, m.created_at DESC, u.full_name ASC`,
    [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id],
  );

  return res.json({
    conversations: (rows as any[]).map((row) => ({
      id: row.id,
      name: row.full_name,
      role: row.role.charAt(0).toUpperCase() + row.role.slice(1),
      lastMessage: getConversationPreview(row),
      timestamp: row.created_at ? formatRelativeTime(row.created_at) : "",
      unread: Number(row.unread ?? 0),
      online: false,
      favorite: Boolean(row.favorite),
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

  const [favoriteRows] = await db.query(
    `SELECT 1
     FROM message_favorites
     WHERE user_id = ? AND favorite_user_id = ?
     LIMIT 1`,
    [req.user.id, otherUserId],
  );

  const [rows] = await db.query(
    `SELECT
       m.id,
       m.sender_id,
       sender.full_name AS sender_name,
       m.content,
       m.attachment_name,
       m.attachment_type,
       m.attachment_data,
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
      favorite: Boolean((favoriteRows as any[])[0]),
    },
    messages: (rows as any[]).map(mapMessageRow),
  });
}

export async function sendMessage(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication is required." });
  }

  const { receiverId, content, attachment } = req.body ?? {};
  const trimmedContent = typeof content === "string" ? content.trim() : "";
  const normalizedAttachment = normalizeAttachment(attachment);

  if ("error" in normalizedAttachment) {
    return res.status(400).json({ message: normalizedAttachment.error });
  }

  if (!receiverId || (!trimmedContent && !normalizedAttachment.value)) {
    return res.status(400).json({ message: "A recipient and either message content or an attachment are required." });
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
    `INSERT INTO messages (sender_id, receiver_id, content, attachment_name, attachment_type, attachment_data, is_read)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [
      req.user.id,
      receiverId,
      trimmedContent,
      normalizedAttachment.value?.name ?? null,
      normalizedAttachment.value?.type ?? null,
      normalizedAttachment.value?.data ?? null,
    ],
  );

  const [rows] = await db.query(
    `SELECT
       m.id,
       m.sender_id,
       sender.full_name AS sender_name,
       m.content,
       m.attachment_name,
       m.attachment_type,
       m.attachment_data,
       m.created_at,
       m.is_read
     FROM messages m
     INNER JOIN users sender ON sender.id = m.sender_id
     WHERE m.id = ?
     LIMIT 1`,
    [result.insertId],
  );

  return res.status(201).json({
    message: mapMessageRow((rows as any[])[0]),
  });
}

export async function toggleFavoriteConversation(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication is required." });
  }

  const favoriteUserId = Number(req.params.userId);

  if (!favoriteUserId || favoriteUserId === req.user.id) {
    return res.status(400).json({ message: "A valid conversation user id is required." });
  }

  const [existingRows] = await db.query(
    `SELECT 1
     FROM message_favorites
     WHERE user_id = ? AND favorite_user_id = ?
     LIMIT 1`,
    [req.user.id, favoriteUserId],
  );

  const isFavorite = Boolean((existingRows as any[])[0]);

  if (isFavorite) {
    await db.execute(
      `DELETE FROM message_favorites
       WHERE user_id = ? AND favorite_user_id = ?`,
      [req.user.id, favoriteUserId],
    );
  } else {
    await db.execute(
      `INSERT INTO message_favorites (user_id, favorite_user_id)
       VALUES (?, ?)`,
      [req.user.id, favoriteUserId],
    );
  }

  return res.json({ favorite: !isFavorite });
}

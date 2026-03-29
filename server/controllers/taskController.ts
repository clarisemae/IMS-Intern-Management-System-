import { Request, Response } from "express";
import { ResultSetHeader } from "mysql2";
import { db } from "../config/db";

function mapTaskRow(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    assignedToId: row.assigned_to,
    assignedToName: row.assigned_to_name,
    assignedById: row.assigned_by,
    assignedByName: row.assigned_by_name,
    deadline: row.deadline,
    priority: row.priority,
    status: row.status === "in_progress" ? "in-progress" : row.status,
    createdAt: row.created_at,
  };
}

async function getTaskById(taskId: number) {
  const [rows] = await db.query(
    `SELECT
       t.id,
       t.title,
       t.description,
       t.assigned_to,
       assignee.full_name AS assigned_to_name,
       t.assigned_by,
       assigner.full_name AS assigned_by_name,
       t.deadline,
       t.priority,
       t.status,
       t.created_at
     FROM tasks t
     INNER JOIN users assignee ON assignee.id = t.assigned_to
     INNER JOIN users assigner ON assigner.id = t.assigned_by
     WHERE t.id = ?
     LIMIT 1`,
    [taskId],
  );

  return (rows as any[])[0] ?? null;
}

async function getInternById(userId: number) {
  const [rows] = await db.query(
    `SELECT id, full_name
     FROM users
     WHERE id = ? AND role = 'intern' AND status = 'active'
     LIMIT 1`,
    [userId],
  );

  return (rows as any[])[0] ?? null;
}

export async function getTasks(req: Request, res: Response) {
  let query = `
    SELECT
      t.id,
      t.title,
      t.description,
      t.assigned_to,
      assignee.full_name AS assigned_to_name,
      t.assigned_by,
      assigner.full_name AS assigned_by_name,
      t.deadline,
      t.priority,
      t.status,
      t.created_at
    FROM tasks t
    INNER JOIN users assignee ON assignee.id = t.assigned_to
    INNER JOIN users assigner ON assigner.id = t.assigned_by
  `;
  const params: Array<number> = [];

  if (req.user?.role === "intern") {
    query += " WHERE t.assigned_to = ?";
    params.push(req.user.id);
  } else if (req.user?.role === "supervisor") {
    query += " WHERE t.assigned_by = ?";
    params.push(req.user.id);
  }

  query += " ORDER BY COALESCE(t.deadline, t.created_at) ASC, t.id DESC";

  const [rows] = await db.query(query, params);

  return res.json({
    tasks: (rows as any[]).map(mapTaskRow),
  });
}

export async function getAssignableInterns(_req: Request, res: Response) {
  const [rows] = await db.query(
    `SELECT id, full_name
     FROM users
     WHERE role = 'intern' AND status = 'active'
     ORDER BY full_name ASC`,
  );

  return res.json({
    interns: (rows as any[]).map((row) => ({
      id: row.id,
      name: row.full_name,
    })),
  });
}

export async function createTask(req: Request, res: Response) {
  const { title, description, assignedToId, deadline, priority, status } = req.body ?? {};

  if (!req.user || (req.user.role !== "supervisor" && req.user.role !== "admin")) {
    return res.status(403).json({ message: "Only supervisors or admins can create tasks." });
  }

  if (!title || !assignedToId || !priority) {
    return res.status(400).json({ message: "Title, assigned intern, and priority are required." });
  }

  const intern = await getInternById(Number(assignedToId));

  if (!intern) {
    return res.status(400).json({ message: "Assigned user must be an active intern." });
  }

  const normalizedStatus = status === "in-progress" ? "in_progress" : status || "pending";

  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO tasks (title, description, assigned_to, assigned_by, deadline, priority, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      description || null,
      intern.id,
      req.user.id,
      deadline || null,
      priority,
      normalizedStatus,
    ],
  );

  const task = await getTaskById(result.insertId);

  return res.status(201).json({ task: mapTaskRow(task) });
}

export async function updateTask(req: Request, res: Response) {
  const taskId = Number(req.params.id);

  if (!taskId) {
    return res.status(400).json({ message: "A valid task id is required." });
  }

  const task = await getTaskById(taskId);

  if (!task) {
    return res.status(404).json({ message: "Task not found." });
  }

  const { title, description, assignedToId, deadline, priority, status } = req.body ?? {};

  if (req.user?.role === "intern") {
    if (task.assigned_to !== req.user.id) {
      return res.status(403).json({ message: "You can only update your own tasks." });
    }

    const normalizedStatus = status === "in-progress" ? "in_progress" : status;

    if (!normalizedStatus || !["pending", "in_progress", "completed"].includes(normalizedStatus)) {
      return res.status(400).json({ message: "A valid task status is required." });
    }

    await db.execute("UPDATE tasks SET status = ? WHERE id = ?", [normalizedStatus, taskId]);
  } else {
    const canManageTask = req.user?.role === "admin" || task.assigned_by === req.user?.id;

    if (!canManageTask) {
      return res.status(403).json({ message: "You can only manage tasks that you assigned." });
    }

    if (!title || !assignedToId || !priority || !status) {
      return res.status(400).json({ message: "Title, assigned intern, priority, and status are required." });
    }

    const intern = await getInternById(Number(assignedToId));

    if (!intern) {
      return res.status(400).json({ message: "Assigned user must be an active intern." });
    }

    const normalizedStatus = status === "in-progress" ? "in_progress" : status;

    await db.execute(
      `UPDATE tasks
       SET title = ?, description = ?, assigned_to = ?, deadline = ?, priority = ?, status = ?
       WHERE id = ?`,
      [
        title,
        description || null,
        intern.id,
        deadline || null,
        priority,
        normalizedStatus,
        taskId,
      ],
    );
  }

  const updatedTask = await getTaskById(taskId);

  return res.json({ task: mapTaskRow(updatedTask) });
}

export async function deleteTask(req: Request, res: Response) {
  const taskId = Number(req.params.id);

  if (!taskId) {
    return res.status(400).json({ message: "A valid task id is required." });
  }

  const task = await getTaskById(taskId);

  if (!task) {
    return res.status(404).json({ message: "Task not found." });
  }

  const canManageTask = req.user?.role === "admin" || task.assigned_by === req.user?.id;

  if (!canManageTask) {
    return res.status(403).json({ message: "You can only delete tasks that you assigned." });
  }

  await db.execute("DELETE FROM tasks WHERE id = ?", [taskId]);

  return res.json({ message: "Task deleted successfully." });
}

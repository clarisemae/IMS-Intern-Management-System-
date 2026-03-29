import { Request, Response } from "express";
import { ResultSetHeader } from "mysql2";
import { db } from "../config/db";
import { getScheduleStatusForNow, getUserSchedule } from "../utils/schedule";

function toDateOnly(value: unknown) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return String(value).slice(0, 10);
}

function calculateHours(timeIn: Date, timeOut: Date) {
  const milliseconds = timeOut.getTime() - timeIn.getTime();
  return Math.max(0, Number((milliseconds / (1000 * 60 * 60)).toFixed(2)));
}

function mapAttendanceRow(row: any) {
  return {
    id: row.id,
    date: toDateOnly(row.attendance_date),
    timeIn: row.time_in,
    timeOut: row.time_out,
    totalHours: row.total_hours,
    status: row.time_out ? "completed" : "active",
    attendanceStatus: row.status,
    reportId: row.report_id ? Number(row.report_id) : null,
    reportStatus: row.report_status
      ? row.report_status === "needs_revision"
        ? "needs-revision"
        : row.report_status
      : null,
  };
}

async function getOpenAttendanceForToday(userId: number) {
  const [rows] = await db.query(
    `SELECT id, attendance_date, time_in, time_out, total_hours, status
     FROM attendance
     WHERE user_id = ? AND attendance_date = CURDATE() AND time_out IS NULL
     LIMIT 1`,
    [userId],
  );

  return (rows as any[])[0] ?? null;
}

export async function getAttendance(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication is required." });
  }

  const [rows] = await db.query(
    `SELECT
       a.id,
       a.attendance_date,
       a.time_in,
       a.time_out,
       a.total_hours,
       a.status,
       (
         SELECT r.id
         FROM reports r
         WHERE r.user_id = a.user_id
           AND r.type = 'daily'
           AND r.report_date = a.attendance_date
         ORDER BY r.id DESC
         LIMIT 1
       ) AS report_id,
       (
         SELECT r.status
         FROM reports r
         WHERE r.user_id = a.user_id
           AND r.type = 'daily'
           AND r.report_date = a.attendance_date
         ORDER BY r.id DESC
         LIMIT 1
       ) AS report_status
     FROM attendance a
     WHERE a.user_id = ?
     ORDER BY a.attendance_date DESC, a.id DESC
     LIMIT 30`,
    [req.user.id],
  );

  const records = (rows as any[]).map(mapAttendanceRow);
  const [todayRows] = await db.query(
    `SELECT
       a.id,
       a.attendance_date,
       a.time_in,
       a.time_out,
       a.total_hours,
       a.status,
       (
         SELECT r.id
         FROM reports r
         WHERE r.user_id = a.user_id
           AND r.type = 'daily'
           AND r.report_date = a.attendance_date
         ORDER BY r.id DESC
         LIMIT 1
       ) AS report_id,
       (
         SELECT r.status
         FROM reports r
         WHERE r.user_id = a.user_id
           AND r.type = 'daily'
           AND r.report_date = a.attendance_date
         ORDER BY r.id DESC
         LIMIT 1
       ) AS report_status
     FROM attendance a
     WHERE a.user_id = ? AND a.attendance_date = CURDATE()
     ORDER BY a.id DESC
     LIMIT 1`,
    [req.user.id],
  );
  const todayRecord = (todayRows as any[])[0] ? mapAttendanceRow((todayRows as any[])[0]) : null;

  const [summaryRows] = await db.query(
    `SELECT
       COALESCE(SUM(total_hours), 0) AS total_hours,
       COALESCE(SUM(CASE WHEN YEARWEEK(attendance_date, 1) = YEARWEEK(CURDATE(), 1) THEN total_hours ELSE 0 END), 0) AS this_week_hours,
       COUNT(*) AS total_entries
     FROM attendance
     WHERE user_id = ?`,
    [req.user.id],
  );

  const summary = (summaryRows as any[])[0];
  const totalHours = Number(summary.total_hours ?? 0);
  const scheduleEntries = await getUserSchedule(req.user.id);
  const todayWeekDay = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
  const todaySchedule = scheduleEntries.find((entry) => entry.day === todayWeekDay) ?? null;
  const scheduleStatus = getScheduleStatusForNow(todaySchedule, todayRecord?.timeIn ?? null);

  return res.json({
    todayRecord,
    records,
    schedule: {
      today: todaySchedule,
      status: scheduleStatus,
      weekly: scheduleEntries,
      requiredHours: 200,
    },
    summary: {
      totalHours,
      thisWeekHours: Number(summary.this_week_hours ?? 0),
      progressPercent: Math.min(100, Number(((totalHours / 200) * 100).toFixed(0))),
      totalEntries: Number(summary.total_entries ?? 0),
    },
  });
}

export async function timeIn(req: Request, res: Response) {
  if (!req.user || req.user.role !== "intern") {
    return res.status(403).json({ message: "Only interns can clock in." });
  }

  const existing = await getOpenAttendanceForToday(req.user.id);

  if (existing) {
    return res.status(400).json({ message: "You are already clocked in for today." });
  }

  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const attendanceStatus = hours > 9 || (hours === 9 && minutes > 0) ? "late" : "present";

  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO attendance (user_id, attendance_date, time_in, status)
     VALUES (?, CURDATE(), NOW(), ?)`,
    [req.user.id, attendanceStatus],
  );

  const [rows] = await db.query(
    `SELECT id, attendance_date, time_in, time_out, total_hours, status
     FROM attendance
     WHERE id = ?
     LIMIT 1`,
    [result.insertId],
  );

  return res.status(201).json({
    record: mapAttendanceRow((rows as any[])[0]),
  });
}

export async function timeOut(req: Request, res: Response) {
  if (!req.user || req.user.role !== "intern") {
    return res.status(403).json({ message: "Only interns can clock out." });
  }

  const openAttendance = await getOpenAttendanceForToday(req.user.id);

  if (!openAttendance) {
    return res.status(400).json({ message: "You must clock in before clocking out." });
  }

  const timeInDate = new Date(openAttendance.time_in);
  const timeOutDate = new Date();
  const totalHours = calculateHours(timeInDate, timeOutDate);

  await db.execute(
    `UPDATE attendance
     SET time_out = NOW(), total_hours = ?
     WHERE id = ?`,
    [totalHours, openAttendance.id],
  );

  const [rows] = await db.query(
    `SELECT id, attendance_date, time_in, time_out, total_hours, status
     FROM attendance
     WHERE id = ?
     LIMIT 1`,
    [openAttendance.id],
  );

  return res.json({
    record: mapAttendanceRow((rows as any[])[0]),
  });
}

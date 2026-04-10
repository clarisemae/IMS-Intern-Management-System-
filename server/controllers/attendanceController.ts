import { Request, Response } from "express";
import { ResultSetHeader } from "mysql2";
import { db } from "../config/db";
import { getScheduleStatusForNow, getUserSchedule, saveUserSchedule } from "../utils/schedule";

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
    supervisorRemark: row.supervisor_remark === "none" ? null : row.supervisor_remark,
    remarkNote: row.remark_note ?? null,
    reportId: row.report_id ? Number(row.report_id) : null,
    reportStatus: row.report_status ? "submitted" : null,
  };
}

async function getOpenAttendanceForToday(userId: number) {
  const [rows] = await db.query(
    `SELECT id, attendance_date, time_in, time_out, total_hours, status, supervisor_remark, remark_note
     FROM attendance
     WHERE user_id = ? AND attendance_date = CURDATE() AND time_out IS NULL
     LIMIT 1`,
    [userId],
  );

  return (rows as any[])[0] ?? null;
}

async function getLatestAttendanceForToday(userId: number) {
  const [rows] = await db.query(
    `SELECT id, attendance_date, time_in, time_out, total_hours, status, supervisor_remark, remark_note
     FROM attendance
     WHERE user_id = ? AND attendance_date = CURDATE()
     ORDER BY id DESC
     LIMIT 1`,
    [userId],
  );

  return (rows as any[])[0] ?? null;
}

function getTodayWeekDayKey() {
  return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
}

async function getAttendanceStatusForClockIn(userId: number, at = new Date()) {
  const scheduleEntries = await getUserSchedule(userId);
  const todaySchedule = scheduleEntries.find((entry) => entry.day === getTodayWeekDayKey()) ?? null;
  const scheduleStatus = getScheduleStatusForNow(todaySchedule, at, at);

  return scheduleStatus.code === "late" ? "late" : "present";
}

async function getManageableIntern(req: Request, internId: number) {
  const departmentFilter = req.user?.role === "supervisor" && req.user.department
    ? " AND department = ?"
    : "";
  const params = req.user?.role === "supervisor" && req.user.department
    ? [internId, req.user.department]
    : [internId];

  const [rows] = await db.query(
    `SELECT id, full_name, department, status
     FROM users
     WHERE id = ? AND role = 'intern' AND status = 'active'${departmentFilter}
     LIMIT 1`,
    params,
  );

  return (rows as any[])[0] ?? null;
}

async function getAttendanceRecordById(attendanceId: number) {
  const [rows] = await db.query(
    `SELECT id, attendance_date, time_in, time_out, total_hours, status, supervisor_remark, remark_note
     FROM attendance
     WHERE id = ?
     LIMIT 1`,
    [attendanceId],
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
       a.supervisor_remark,
       a.remark_note,
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
         SELECT 'submitted'
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
       a.supervisor_remark,
       a.remark_note,
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
         SELECT 'submitted'
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
  const todayWeekDay = getTodayWeekDayKey();
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

  const attendanceStatus = await getAttendanceStatusForClockIn(req.user.id);

  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO attendance (user_id, attendance_date, time_in, status, supervisor_remark, remark_note)
     VALUES (?, CURDATE(), NOW(), ?, 'none', NULL)`,
    [req.user.id, attendanceStatus],
  );

  const [rows] = await db.query(
    `SELECT id, attendance_date, time_in, time_out, total_hours, status, supervisor_remark, remark_note
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
    `SELECT id, attendance_date, time_in, time_out, total_hours, status, supervisor_remark, remark_note
     FROM attendance
     WHERE id = ?
     LIMIT 1`,
    [openAttendance.id],
  );

  return res.json({
    record: mapAttendanceRow((rows as any[])[0]),
  });
}

export async function updateInternSchedule(req: Request, res: Response) {
  if (!req.user || (req.user.role !== "supervisor" && req.user.role !== "admin")) {
    return res.status(403).json({ message: "Only supervisors or admins can update intern schedules." });
  }

  const internId = Number(req.params.internId);
  const schedule = req.body?.schedule;

  if (!internId || !Array.isArray(schedule)) {
    return res.status(400).json({ message: "A valid intern and schedule are required." });
  }

  const intern = await getManageableIntern(req, internId);

  if (!intern) {
    return res.status(404).json({ message: "Intern not found for your scope." });
  }

  await saveUserSchedule(internId, schedule);
  const savedSchedule = await getUserSchedule(internId);

  return res.json({ schedule: savedSchedule });
}

export async function supervisorTimeIn(req: Request, res: Response) {
  if (!req.user || (req.user.role !== "supervisor" && req.user.role !== "admin")) {
    return res.status(403).json({ message: "Only supervisors or admins can manage intern attendance." });
  }

  const internId = Number(req.params.internId);

  if (!internId) {
    return res.status(400).json({ message: "A valid intern id is required." });
  }

  const intern = await getManageableIntern(req, internId);

  if (!intern) {
    return res.status(404).json({ message: "Intern not found for your scope." });
  }

  const existing = await getOpenAttendanceForToday(internId);

  if (existing) {
    return res.status(400).json({ message: `${intern.full_name} is already clocked in for today.` });
  }

  const attendanceStatus = await getAttendanceStatusForClockIn(internId);
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO attendance (user_id, attendance_date, time_in, status, supervisor_remark, remark_note)
     VALUES (?, CURDATE(), NOW(), ?, 'none', NULL)`,
    [internId, attendanceStatus],
  );

  const record = await getAttendanceRecordById(result.insertId);

  return res.status(201).json({ record: mapAttendanceRow(record) });
}

export async function supervisorTimeOut(req: Request, res: Response) {
  if (!req.user || (req.user.role !== "supervisor" && req.user.role !== "admin")) {
    return res.status(403).json({ message: "Only supervisors or admins can manage intern attendance." });
  }

  const internId = Number(req.params.internId);

  if (!internId) {
    return res.status(400).json({ message: "A valid intern id is required." });
  }

  const intern = await getManageableIntern(req, internId);

  if (!intern) {
    return res.status(404).json({ message: "Intern not found for your scope." });
  }

  const openAttendance = await getOpenAttendanceForToday(internId);

  if (!openAttendance) {
    return res.status(400).json({ message: `${intern.full_name} must be clocked in before clocking out.` });
  }

  const totalHours = calculateHours(new Date(openAttendance.time_in), new Date());

  await db.execute(
    `UPDATE attendance
     SET time_out = NOW(), total_hours = ?
     WHERE id = ?`,
    [totalHours, openAttendance.id],
  );

  const record = await getAttendanceRecordById(openAttendance.id);

  return res.json({ record: mapAttendanceRow(record) });
}

export async function updateInternAttendanceRemark(req: Request, res: Response) {
  if (!req.user || (req.user.role !== "supervisor" && req.user.role !== "admin")) {
    return res.status(403).json({ message: "Only supervisors or admins can manage intern attendance remarks." });
  }

  const internId = Number(req.params.internId);
  const remark = typeof req.body?.remark === "string" ? req.body.remark.trim() : "";
  const remarkNote = typeof req.body?.remarkNote === "string" ? req.body.remarkNote.trim() : "";

  if (!internId || !remark) {
    return res.status(400).json({ message: "A valid intern and remark are required." });
  }

  if (!["early_out", "half_day", "absent"].includes(remark)) {
    return res.status(400).json({ message: "Remark must be early_out, half_day, or absent." });
  }

  const intern = await getManageableIntern(req, internId);

  if (!intern) {
    return res.status(404).json({ message: "Intern not found for your scope." });
  }

  const todayAttendance = await getLatestAttendanceForToday(internId);

  if (remark === "absent") {
    if (todayAttendance?.time_in) {
      return res.status(400).json({ message: "This intern already clocked in today. Use half day or early out instead." });
    }

    if (todayAttendance) {
      await db.execute(
        `UPDATE attendance
         SET status = 'absent', total_hours = 0, supervisor_remark = 'absent', remark_note = ?, time_in = NULL, time_out = NULL
         WHERE id = ?`,
        [remarkNote || null, todayAttendance.id],
      );

      const updatedRecord = await getAttendanceRecordById(todayAttendance.id);
      return res.json({ record: mapAttendanceRow(updatedRecord) });
    }

    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO attendance (user_id, attendance_date, time_in, time_out, total_hours, status, supervisor_remark, remark_note)
       VALUES (?, CURDATE(), NULL, NULL, 0, 'absent', 'absent', ?)`,
      [internId, remarkNote || null],
    );

    const createdRecord = await getAttendanceRecordById(result.insertId);
    return res.status(201).json({ record: mapAttendanceRow(createdRecord) });
  }

  if (!todayAttendance?.time_in) {
    return res.status(400).json({ message: "The intern must have a time in record before applying this remark." });
  }

  if (!todayAttendance.time_out) {
    const calculatedHours = calculateHours(new Date(todayAttendance.time_in), new Date());

    await db.execute(
      `UPDATE attendance
       SET time_out = NOW(), total_hours = ?, supervisor_remark = ?, remark_note = ?
       WHERE id = ?`,
      [calculatedHours, remark, remarkNote || null, todayAttendance.id],
    );
  } else {
    await db.execute(
      `UPDATE attendance
       SET supervisor_remark = ?, remark_note = ?
       WHERE id = ?`,
      [remark, remarkNote || null, todayAttendance.id],
    );
  }

  const updatedRecord = await getAttendanceRecordById(todayAttendance.id);

  return res.json({ record: mapAttendanceRow(updatedRecord) });
}

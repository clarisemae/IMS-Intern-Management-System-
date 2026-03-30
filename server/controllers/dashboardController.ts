import { Request, Response } from "express";
import { db } from "../config/db";
import { getScheduleStatusForNow, getUserSchedule } from "../utils/schedule";

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

export async function getDashboardOverview(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication is required." });
  }

  if (req.user.role === "intern") {
    const [attendanceRows] = await db.query(
      `SELECT attendance_date, time_in, time_out, total_hours
       FROM attendance
       WHERE user_id = ?
       ORDER BY attendance_date DESC, id DESC
       LIMIT 1`,
      [req.user.id],
    );
    const [attendanceSummaryRows] = await db.query(
      `SELECT
         COALESCE(SUM(total_hours), 0) AS total_hours,
         COALESCE(SUM(CASE WHEN YEARWEEK(attendance_date, 1) = YEARWEEK(CURDATE(), 1) THEN total_hours ELSE 0 END), 0) AS this_week_hours
       FROM attendance
       WHERE user_id = ?`,
      [req.user.id],
    );
    const [taskRows] = await db.query(
      `SELECT id, title, deadline, priority, status
       FROM tasks
       WHERE assigned_to = ?
       ORDER BY CASE WHEN status = 'completed' THEN 1 ELSE 0 END, COALESCE(deadline, created_at) ASC
       LIMIT 5`,
      [req.user.id],
    );
    const [taskSummaryRows] = await db.query(
      `SELECT
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks,
         SUM(CASE WHEN status <> 'completed' THEN 1 ELSE 0 END) AS pending_tasks
       FROM tasks
       WHERE assigned_to = ?`,
      [req.user.id],
    );
    const [reportRows] = await db.query(
      `SELECT type, status, created_at
       FROM reports
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 3`,
      [req.user.id],
    );

    const latestAttendance = (attendanceRows as any[])[0] ?? null;
    const attendanceSummary = (attendanceSummaryRows as any[])[0] ?? {};
    const taskSummary = (taskSummaryRows as any[])[0] ?? {};
    const totalHours = Number(attendanceSummary.total_hours ?? 0);
    const scheduleEntries = await getUserSchedule(req.user.id);
    const todayWeekDay = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
    const todaySchedule = scheduleEntries.find((entry) => entry.day === todayWeekDay) ?? null;
    const scheduleStatus = getScheduleStatusForNow(todaySchedule, latestAttendance?.time_in ?? null);

    return res.json({
      attendance: {
        status: latestAttendance && !latestAttendance.time_out ? "clocked-in" : "clocked-out",
        date: latestAttendance?.attendance_date ?? new Date().toISOString().slice(0, 10),
        timeIn: latestAttendance?.time_in ?? null,
        timeOut: latestAttendance?.time_out ?? null,
        totalHours,
        progressPercent: Math.min(100, Number(((totalHours / 200) * 100).toFixed(0))),
        schedule: todaySchedule,
        scheduleStatus,
      },
      stats: {
        hoursCompleted: totalHours,
        tasksCompleted: Number(taskSummary.completed_tasks ?? 0),
        pendingTasks: Number(taskSummary.pending_tasks ?? 0),
        hoursThisWeek: Number(attendanceSummary.this_week_hours ?? 0),
      },
      tasks: (taskRows as any[]).map((row) => ({
        id: row.id,
        title: row.title,
        deadline: row.deadline,
        priority: row.priority,
        status: row.status === "in_progress" ? "in-progress" : row.status,
      })),
      notifications: (reportRows as any[]).map((row, index) => ({
        id: index + 1,
        message: `You saved a ${row.type} report`,
        time: formatRelativeTime(row.created_at),
      })).concat(
        scheduleStatus.code === "late"
          ? [{
              id: 999,
              message: `Late reminder: you are already past the 15-minute grace period for your ${todaySchedule?.startTime} shift.`,
              time: "Now",
            }]
          : scheduleStatus.code === "grace"
            ? [{
                id: 998,
                message: `Clock in reminder: you are currently within the 15-minute grace period for your ${todaySchedule?.startTime} shift.`,
                time: "Now",
              }]
            : [],
      ).concat({
        id: 1000,
        message: todaySchedule?.isActive
          ? `${todaySchedule.label} schedule: ${todaySchedule.startTime} - ${todaySchedule.endTime} (${scheduleStatus.label})`
          : "No schedule set for today.",
        time: "Today",
      }),
    });
  }

  if (req.user.role === "supervisor") {
    const [internRows] = await db.query(
      `SELECT
         u.id,
         u.full_name,
         u.status,
         COALESCE(att.total_hours, 0) AS hours_completed,
         COALESCE(task_stats.tasks_completed, 0) AS tasks_completed,
         COALESCE(task_stats.pending_tasks, 0) AS pending_tasks
       FROM users u
       LEFT JOIN (
         SELECT user_id, SUM(total_hours) AS total_hours
         FROM attendance
         GROUP BY user_id
       ) att ON att.user_id = u.id
       LEFT JOIN (
         SELECT
           assigned_to,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS tasks_completed,
           SUM(CASE WHEN status <> 'completed' THEN 1 ELSE 0 END) AS pending_tasks
         FROM tasks
         WHERE assigned_by = ?
         GROUP BY assigned_to
       ) task_stats ON task_stats.assigned_to = u.id
       WHERE u.role = 'intern' AND u.status = 'active'
       ORDER BY u.full_name ASC`,
      [req.user.id],
    );
    const [deadlineRows] = await db.query(
      `SELECT t.id, t.title, u.full_name AS intern, t.deadline
       FROM tasks t
       INNER JOIN users u ON u.id = t.assigned_to
       WHERE t.assigned_by = ? AND t.status <> 'completed'
       ORDER BY COALESCE(t.deadline, t.created_at) ASC
       LIMIT 5`,
      [req.user.id],
    );

    const interns = await Promise.all((internRows as any[]).map(async (row) => {
      const scheduleEntries = await getUserSchedule(row.id);
      const todayWeekDay = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
      const todaySchedule = scheduleEntries.find((entry) => entry.day === todayWeekDay) ?? null;

      const [todayAttendanceRows] = await db.query(
        `SELECT time_in
         FROM attendance
         WHERE user_id = ? AND attendance_date = CURDATE()
         ORDER BY id DESC
         LIMIT 1`,
        [row.id],
      );

      const todayAttendance = (todayAttendanceRows as any[])[0] ?? null;
      const scheduleStatus = getScheduleStatusForNow(todaySchedule, todayAttendance?.time_in ?? null);

      return {
      id: row.id,
      name: row.full_name,
      status: row.status,
      hoursCompleted: Number(row.hours_completed ?? 0),
      totalHours: 200,
      tasksCompleted: Number(row.tasks_completed ?? 0),
      pendingTasks: Number(row.pending_tasks ?? 0),
      attendance: Math.min(100, Number(((Number(row.hours_completed ?? 0) / 200) * 100).toFixed(0))),
      schedule: todaySchedule,
      scheduleStatus,
    };
    }));
    const totalCompleted = interns.reduce((sum, intern) => sum + intern.tasksCompleted, 0);
    const avgPerformance = interns.length
      ? Math.round(interns.reduce((sum, intern) => sum + intern.attendance, 0) / interns.length)
      : 0;
    const scheduleAlerts = interns
      .filter((intern) => intern.scheduleStatus.code === "late" || intern.scheduleStatus.code === "missed")
      .slice(0, 3)
      .map((intern, index) => ({
        id: index + 1,
        name: intern.name,
        detail: intern.scheduleStatus.detail,
        status: intern.scheduleStatus.label,
      }));

    return res.json({
      stats: {
        activeInterns: interns.length,
        tasksCompleted: totalCompleted,
        avgPerformance,
      },
      interns,
      scheduleAlerts,
      upcomingDeadlines: (deadlineRows as any[]).map((row) => ({
        id: row.id,
        task: row.title,
        intern: row.intern,
        deadline: row.deadline,
      })),
    });
  }

  const [userCountRows] = await db.query(`SELECT role, COUNT(*) AS total FROM users GROUP BY role`);
  const [activeUserRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM users
     WHERE status = 'active'`,
  );
  const [hoursRows] = await db.query(`SELECT COALESCE(SUM(total_hours), 0) AS total_hours FROM attendance`);
  const [taskStatsRows] = await db.query(
    `SELECT
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks,
       SUM(CASE WHEN status <> 'completed' THEN 1 ELSE 0 END) AS pending_tasks
     FROM tasks`,
  );
  const [attendanceTrendRows] = await db.query(
    `SELECT DATE_FORMAT(attendance_date, '%b') AS month, ROUND(COALESCE(SUM(total_hours), 0), 1) AS hours
     FROM attendance
     WHERE attendance_date >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
     GROUP BY YEAR(attendance_date), MONTH(attendance_date), DATE_FORMAT(attendance_date, '%b')
     ORDER BY YEAR(attendance_date), MONTH(attendance_date)`,
  );
  const [taskCompletionRows] = await db.query(
    `SELECT
       CONCAT('Week ', WEEK(created_at, 1)) AS week,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN status <> 'completed' THEN 1 ELSE 0 END) AS pending
     FROM tasks
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
     GROUP BY YEAR(created_at), WEEK(created_at, 1)
     ORDER BY YEAR(created_at), WEEK(created_at, 1)`,
  );
  const [recentReportRows] = await db.query(
    `SELECT u.full_name AS user, r.type, r.status, r.created_at
     FROM reports r
     INNER JOIN users u ON u.id = r.user_id
     ORDER BY r.created_at DESC
     LIMIT 5`,
  );

  const roleCounts = Object.fromEntries((userCountRows as any[]).map((row) => [row.role, Number(row.total)]));
  const totalUsers = Object.values(roleCounts).reduce((sum: number, value: any) => sum + Number(value), 0);
  const totalHoursLogged = Number((hoursRows as any[])[0]?.total_hours ?? 0);
  const taskStats = (taskStatsRows as any[])[0] ?? {};
  const completedTasks = Number(taskStats.completed_tasks ?? 0);
  const pendingTasks = Number(taskStats.pending_tasks ?? 0);
  const totalTasks = completedTasks + pendingTasks;
  const taskCompletionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const attendanceRate = totalUsers ? Math.min(100, Math.round((totalHoursLogged / (totalUsers * 200)) * 100)) : 0;
  const activeUserRate = totalUsers
    ? Math.round((Number((activeUserRows as any[])[0]?.total ?? 0) / totalUsers) * 100)
    : 0;

  return res.json({
    systemStats: {
      totalUsers,
      activeInterns: roleCounts.intern || 0,
      totalHoursLogged,
      completedTasks,
      pendingReports: (recentReportRows as any[]).length,
    },
    attendanceData: (attendanceTrendRows as any[]).map((row) => ({ month: row.month, hours: Number(row.hours) })),
    taskCompletionData: (taskCompletionRows as any[]).map((row) => ({
      week: row.week,
      completed: Number(row.completed),
      pending: Number(row.pending),
    })),
    userDistribution: [
      { name: "Interns", value: roleCounts.intern || 0, color: "#3b82f6" },
      { name: "Supervisors", value: roleCounts.supervisor || 0, color: "#8b5cf6" },
      { name: "Admins", value: roleCounts.admin || 0, color: "#10b981" },
    ],
    recentActivities: (recentReportRows as any[]).map((row, index) => ({
      id: index + 1,
      user: row.user,
      action: `submitted a ${row.type} report`,
      time: formatRelativeTime(row.created_at),
    })),
    health: {
      attendanceRate,
      taskCompletionRate,
      activeUserRate,
    },
  });
}

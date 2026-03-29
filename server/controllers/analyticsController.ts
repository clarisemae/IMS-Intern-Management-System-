import { Request, Response } from "express";
import { db } from "../config/db";

export async function getAnalytics(req: Request, res: Response) {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "supervisor")) {
    return res.status(403).json({ message: "You do not have permission to view analytics." });
  }

  const [performanceRows] = await db.query(
    `SELECT
       u.full_name AS name,
       LEAST(100, ROUND(COALESCE(att.total_hours, 0) / 200 * 100)) AS attendance,
       LEAST(100, ROUND(COALESCE(task_stats.completed_tasks, 0) / NULLIF(COALESCE(task_stats.total_tasks, 0), 0) * 100)) AS task_completion,
       LEAST(100, ROUND(COALESCE(report_stats.approved_reports, 0) / NULLIF(COALESCE(report_stats.total_reports, 0), 0) * 100)) AS report_quality
     FROM users u
     LEFT JOIN (
       SELECT user_id, SUM(total_hours) AS total_hours
       FROM attendance
       GROUP BY user_id
     ) att ON att.user_id = u.id
     LEFT JOIN (
       SELECT
         assigned_to,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks,
         COUNT(*) AS total_tasks
       FROM tasks
       GROUP BY assigned_to
     ) task_stats ON task_stats.assigned_to = u.id
     LEFT JOIN (
       SELECT
         user_id,
         SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_reports,
         COUNT(*) AS total_reports
       FROM reports
       GROUP BY user_id
     ) report_stats ON report_stats.user_id = u.id
     WHERE u.role = 'intern' AND u.status = 'active'
     ORDER BY u.full_name ASC`,
  );

  const [monthlyRows] = await db.query(
    `SELECT
       DATE_FORMAT(month_ref.month_start, '%b') AS month,
       (
         SELECT COUNT(*)
         FROM users u
         WHERE u.role = 'intern'
           AND DATE_FORMAT(u.created_at, '%Y-%m') <= DATE_FORMAT(month_ref.month_start, '%Y-%m')
       ) AS interns,
       (
         SELECT COALESCE(SUM(total_hours), 0)
         FROM attendance a
         WHERE DATE_FORMAT(a.attendance_date, '%Y-%m') = DATE_FORMAT(month_ref.month_start, '%Y-%m')
       ) AS hours,
       (
         SELECT COUNT(*)
         FROM tasks t
         WHERE DATE_FORMAT(t.created_at, '%Y-%m') = DATE_FORMAT(month_ref.month_start, '%Y-%m')
       ) AS tasks
     FROM (
       SELECT DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL seq.n MONTH) AS month_start
       FROM (
         SELECT 5 AS n UNION ALL SELECT 4 UNION ALL SELECT 3 UNION ALL SELECT 2 UNION ALL SELECT 1 UNION ALL SELECT 0
       ) seq
     ) month_ref
     ORDER BY month_ref.month_start ASC`,
  );

  const [departmentRows] = await db.query(
    `SELECT
       COALESCE(NULLIF(u.department, ''), 'Unassigned') AS department,
       COUNT(*) AS interns,
       ROUND(COALESCE(SUM(att.total_hours), 0) / NULLIF(COUNT(*), 0), 1) AS avg_hours,
       ROUND(COALESCE(SUM(task_stats.completed_tasks), 0) / NULLIF(SUM(task_stats.total_tasks), 0) * 100) AS task_completion
     FROM users u
     LEFT JOIN (
       SELECT user_id, SUM(total_hours) AS total_hours
       FROM attendance
       GROUP BY user_id
     ) att ON att.user_id = u.id
     LEFT JOIN (
       SELECT
         assigned_to,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks,
         COUNT(*) AS total_tasks
       FROM tasks
       GROUP BY assigned_to
     ) task_stats ON task_stats.assigned_to = u.id
     WHERE u.role = 'intern' AND u.status = 'active'
     GROUP BY COALESCE(NULLIF(u.department, ''), 'Unassigned')
     ORDER BY interns DESC, department ASC`,
  );

  const [hourlyRows] = await db.query(
    `SELECT
       CONCAT(
         LPAD(HOUR(time_in), 2, '0'),
         ':00'
       ) AS hour,
       COUNT(*) AS count
     FROM attendance
     WHERE time_in IS NOT NULL
     GROUP BY HOUR(time_in)
     ORDER BY HOUR(time_in) ASC`,
  );

  const [metricRows] = await db.query(
    `SELECT
       ROUND(COALESCE(AVG(total_hours), 0), 1) AS avg_hours_week,
       COALESCE(SUM(total_hours), 0) AS total_hours
     FROM attendance
     WHERE attendance_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
  );

  const [taskMetricRows] = await db.query(
    `SELECT
       ROUND(COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0) * 100, 0)) AS completion_rate
     FROM tasks`,
  );

  const [reportMetricRows] = await db.query(
    `SELECT
       ROUND(COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0) * 100, 0)) AS quality_rate
     FROM reports`,
  );

  const performanceData = (performanceRows as any[]).map((row) => ({
    name: row.name,
    attendance: Number(row.attendance ?? 0),
    taskCompletion: Number(row.task_completion ?? 0),
    reportQuality: Number(row.report_quality ?? 0),
  }));

  const avgAttendance = performanceData.length
    ? Math.round(performanceData.reduce((sum, row) => sum + row.attendance, 0) / performanceData.length)
    : 0;

  const avgHoursWeek = Number((metricRows as any[])[0]?.avg_hours_week ?? 0);
  const taskCompletion = Number((taskMetricRows as any[])[0]?.completion_rate ?? 0);
  const performanceScore = performanceData.length
    ? Math.round(performanceData.reduce((sum, row) => sum + ((row.attendance + row.taskCompletion + row.reportQuality) / 3), 0) / performanceData.length)
    : 0;

  return res.json({
    metrics: [
      { label: 'Avg. Attendance', value: `${avgAttendance}%`, change: 'Live', trend: 'up', icon: 'users' },
      { label: 'Avg. Hours/Week', value: String(avgHoursWeek), change: 'Live', trend: 'up', icon: 'clock' },
      { label: 'Task Completion', value: `${taskCompletion}%`, change: 'Live', trend: 'up', icon: 'check' },
      { label: 'Performance Score', value: `${performanceScore}%`, change: 'Live', trend: 'up', icon: 'trending' },
    ],
    performanceData,
    monthlyTrends: (monthlyRows as any[]).map((row) => ({
      month: row.month,
      interns: Number(row.interns ?? 0),
      hours: Number(row.hours ?? 0),
      tasks: Number(row.tasks ?? 0),
    })),
    departmentStats: (departmentRows as any[]).map((row) => ({
      department: row.department,
      interns: Number(row.interns ?? 0),
      avgHours: Number(row.avg_hours ?? 0),
      taskCompletion: Number(row.task_completion ?? 0),
    })),
    hourlyDistribution: (hourlyRows as any[]).map((row) => ({
      hour: row.hour,
      count: Number(row.count ?? 0),
    })),
    reportQualityRate: Number((reportMetricRows as any[])[0]?.quality_rate ?? 0),
  });
}

import { Request, Response } from "express";
import { ResultSetHeader } from "mysql2";
import { db } from "../config/db";

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

function mapReportRow(row: any) {
  return {
    id: row.id,
    type: row.type,
    date: toDateOnly(row.report_date),
    content: row.content,
    imageData: row.image_data,
    status: "submitted",
    submittedById: row.user_id,
    submittedBy: row.submitted_by_name,
    createdAt: row.created_at,
  };
}

async function getReportById(reportId: number) {
  const [rows] = await db.query(
    `SELECT
       r.id,
       r.user_id,
       submitter.full_name AS submitted_by_name,
       r.type,
       r.report_date,
       r.content,
       r.image_data,
       r.status,
       r.created_at
     FROM reports r
     INNER JOIN users submitter ON submitter.id = r.user_id
     WHERE r.id = ?
     LIMIT 1`,
    [reportId],
  );

  return (rows as any[])[0] ?? null;
}

async function getExistingDailyReport(userId: number, date: string) {
  const [rows] = await db.query(
    `SELECT
       r.id,
       r.user_id,
       submitter.full_name AS submitted_by_name,
       r.type,
       r.report_date,
       r.content,
       r.image_data,
       r.status,
       r.created_at
     FROM reports r
     INNER JOIN users submitter ON submitter.id = r.user_id
     WHERE r.user_id = ? AND r.type = 'daily' AND r.report_date = ?
     ORDER BY r.id DESC
     LIMIT 1`,
    [userId, date],
  );

  return (rows as any[])[0] ?? null;
}

function canAccessReport(requestUser: Request["user"], report: any) {
  if (!requestUser) {
    return false;
  }

  if (requestUser.role === "intern") {
    return report.user_id === requestUser.id;
  }

  return requestUser.role === "supervisor" || requestUser.role === "admin";
}

function normalizeImageData(value: unknown) {
  if (value == null || value === "") {
    return { value: null as string | null };
  }

  if (typeof value !== "string") {
    return { error: "Report image must be a valid string." };
  }

  const trimmedValue = value.trim();
  const isSupportedImage = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i.test(trimmedValue);

  if (!isSupportedImage) {
    return { error: "Only PNG, JPG, JPEG, or WEBP images are supported." };
  }

  if (trimmedValue.length > 5_000_000) {
    return { error: "Report image is too large. Please use a smaller image." };
  }

  return { value: trimmedValue.replace(/^data:image\/jpg;/i, "data:image/jpeg;") };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildWordDocument(report: any) {
  const imageSection = report.image_data
    ? `
      <h2>Attached Image</h2>
      <p><img src="${report.image_data}" alt="Report attachment" style="max-width: 520px; border-radius: 8px;" /></p>
    `
    : "";

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Daily Log</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
          h1 { margin-bottom: 8px; }
          h2 { margin-top: 28px; margin-bottom: 8px; }
          p { line-height: 1.55; }
          .meta p { margin: 4px 0; }
          .content {
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 16px;
            white-space: pre-wrap;
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(report.type === "daily" ? "Daily Log" : "Weekly Log")}</h1>
        <div class="meta">
          <p><strong>Intern:</strong> ${escapeHtml(report.submitted_by_name ?? "")}</p>
          <p><strong>Date:</strong> ${new Date(report.report_date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}</p>
          <p><strong>Saved As:</strong> Daily Attendance Log</p>
        </div>
        <h2>Activities</h2>
        <div class="content">${escapeHtml(report.content).replaceAll("\n", "<br />")}</div>
        ${imageSection}
      </body>
    </html>
  `;
}

export async function getReports(req: Request, res: Response) {
  let query = `
    SELECT
      r.id,
      r.user_id,
      submitter.full_name AS submitted_by_name,
      r.type,
      r.report_date,
      r.content,
      r.image_data,
      r.status,
      r.created_at
    FROM reports r
    INNER JOIN users submitter ON submitter.id = r.user_id
  `;
  const params: number[] = [];

  if (req.user?.role === "intern") {
    query += " WHERE r.user_id = ?";
    params.push(req.user.id);
  }

  query += " ORDER BY r.report_date DESC, r.id DESC";

  const [rows] = await db.query(query, params);

  return res.json({
    reports: (rows as any[]).map(mapReportRow),
  });
}

export async function createReport(req: Request, res: Response) {
  const { type, date, content, imageData } = req.body ?? {};
  const normalizedDate = toDateOnly(date);

  if (!req.user || req.user.role !== "intern") {
    return res.status(403).json({ message: "Only interns can submit reports." });
  }

  if (!type || !normalizedDate || !content) {
    return res.status(400).json({ message: "Report type, date, and content are required." });
  }

  const normalizedImage = normalizeImageData(imageData);

  if ("error" in normalizedImage) {
    return res.status(400).json({ message: normalizedImage.error });
  }

  if (type === "daily") {
    const existingReport = await getExistingDailyReport(req.user.id, normalizedDate);

    if (existingReport) {
      await db.execute(
        `UPDATE reports
         SET content = ?, image_data = ?, status = 'pending'
         WHERE id = ?`,
        [content, normalizedImage.value ?? null, existingReport.id],
      );

      const updatedExistingReport = await getReportById(existingReport.id);

      return res.json({
        report: mapReportRow(updatedExistingReport),
        message: "An existing daily log for this date was updated.",
      });
    }
  }

  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO reports (user_id, type, report_date, content, image_data, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [req.user.id, type, normalizedDate, content, normalizedImage.value ?? null],
  );

  const report = await getReportById(result.insertId);

  return res.status(201).json({ report: mapReportRow(report) });
}

export async function updateReport(req: Request, res: Response) {
  const reportId = Number(req.params.id);
  const { type, date, content, imageData } = req.body ?? {};
  const normalizedDate = toDateOnly(date);

  if (!reportId) {
    return res.status(400).json({ message: "A valid report id is required." });
  }

  const report = await getReportById(reportId);

  if (!report) {
    return res.status(404).json({ message: "Report not found." });
  }

  if (!req.user || req.user.role !== "intern" || report.user_id !== req.user.id) {
    return res.status(403).json({ message: "You can only update your own reports." });
  }

  if (!type || !normalizedDate || !content) {
    return res.status(400).json({ message: "Report type, date, and content are required." });
  }

  const normalizedImage = normalizeImageData(imageData);

  if ("error" in normalizedImage) {
    return res.status(400).json({ message: normalizedImage.error });
  }

  if (type === "daily") {
    const existingReport = await getExistingDailyReport(req.user.id, normalizedDate);

    if (existingReport && existingReport.id !== reportId) {
      return res.status(400).json({ message: "A daily log already exists for this date." });
    }
  }

  await db.execute(
    `UPDATE reports
     SET type = ?, report_date = ?, content = ?, image_data = ?, status = 'pending'
     WHERE id = ?`,
    [type, normalizedDate, content, normalizedImage.value ?? null, reportId],
  );

  const updatedReport = await getReportById(reportId);

  return res.json({ report: mapReportRow(updatedReport) });
}

export async function getReport(req: Request, res: Response) {
  const reportId = Number(req.params.id);

  if (!reportId) {
    return res.status(400).json({ message: "A valid report id is required." });
  }

  const report = await getReportById(reportId);

  if (!report) {
    return res.status(404).json({ message: "Report not found." });
  }

  if (!canAccessReport(req.user, report)) {
    return res.status(403).json({ message: "You do not have permission to view this report." });
  }

  return res.json({ report: mapReportRow(report) });
}

export async function downloadReport(req: Request, res: Response) {
  const reportId = Number(req.params.id);

  if (!reportId) {
    return res.status(400).json({ message: "A valid report id is required." });
  }

  const report = await getReportById(reportId);

  if (!report) {
    return res.status(404).json({ message: "Report not found." });
  }

  if (!canAccessReport(req.user, report)) {
    return res.status(403).json({ message: "You do not have permission to download this report." });
  }

  const filename = `${report.type}-report-${String(report.report_date).slice(0, 10)}.doc`;

  res.setHeader("Content-Type", "application/msword; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buildWordDocument(report));
}

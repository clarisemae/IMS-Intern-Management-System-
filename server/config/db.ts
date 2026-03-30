import mysql from "mysql2/promise";

export const db = mysql.createPool({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "ims_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function ensureReportImageColumn() {
  const [rows] = await db.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'reports'
       AND COLUMN_NAME = 'image_data'
     LIMIT 1`,
  );

  if ((rows as any[]).length === 0) {
    await db.execute(`ALTER TABLE reports ADD COLUMN image_data MEDIUMTEXT NULL AFTER content`);
  }
}

async function ensureInternSchedulesTable() {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS intern_schedules (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      day_of_week TINYINT UNSIGNED NOT NULL,
      start_time TIME DEFAULT NULL,
      end_time TIME DEFAULT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_intern_schedule_day (user_id, day_of_week),
      CONSTRAINT fk_intern_schedules_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  );
}

async function ensureUniqueDailyReports() {
  await db.execute(
    `DELETE duplicate_reports
     FROM reports duplicate_reports
     INNER JOIN reports kept_reports
       ON duplicate_reports.user_id = kept_reports.user_id
      AND duplicate_reports.type = kept_reports.type
      AND duplicate_reports.report_date = kept_reports.report_date
      AND duplicate_reports.id < kept_reports.id`,
  );

  const [rows] = await db.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'reports'
       AND INDEX_NAME = 'uniq_reports_user_type_date'
     LIMIT 1`,
  );

  if ((rows as any[]).length === 0) {
    await db.execute(
      `ALTER TABLE reports
       ADD UNIQUE KEY uniq_reports_user_type_date (user_id, type, report_date)`,
    );
  }
}

async function ensureMessageEnhancements() {
  const [attachmentNameRows] = await db.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'messages'
       AND COLUMN_NAME = 'attachment_name'
     LIMIT 1`,
  );

  if ((attachmentNameRows as any[]).length === 0) {
    await db.execute(`ALTER TABLE messages ADD COLUMN attachment_name VARCHAR(255) NULL AFTER content`);
  }

  const [attachmentTypeRows] = await db.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'messages'
       AND COLUMN_NAME = 'attachment_type'
     LIMIT 1`,
  );

  if ((attachmentTypeRows as any[]).length === 0) {
    await db.execute(`ALTER TABLE messages ADD COLUMN attachment_type VARCHAR(120) NULL AFTER attachment_name`);
  }

  const [attachmentDataRows] = await db.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'messages'
       AND COLUMN_NAME = 'attachment_data'
     LIMIT 1`,
  );

  if ((attachmentDataRows as any[]).length === 0) {
    await db.execute(`ALTER TABLE messages ADD COLUMN attachment_data MEDIUMTEXT NULL AFTER attachment_type`);
  }

  await db.execute(
    `CREATE TABLE IF NOT EXISTS message_favorites (
      user_id INT UNSIGNED NOT NULL,
      favorite_user_id INT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, favorite_user_id),
      CONSTRAINT fk_message_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_message_favorites_target FOREIGN KEY (favorite_user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  );
}

export async function testDatabaseConnection() {
  const connection = await db.getConnection();
  connection.release();
  await ensureInternSchedulesTable();
  await ensureReportImageColumn();
  await ensureUniqueDailyReports();
  await ensureMessageEnhancements();
}

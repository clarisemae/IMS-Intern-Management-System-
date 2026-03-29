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

export async function testDatabaseConnection() {
  const connection = await db.getConnection();
  connection.release();
  await ensureInternSchedulesTable();
  await ensureReportImageColumn();
}

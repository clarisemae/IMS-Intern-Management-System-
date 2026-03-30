import { db } from "../config/db";

export const weekDays = [
  { key: "monday", label: "Monday", index: 1 },
  { key: "tuesday", label: "Tuesday", index: 2 },
  { key: "wednesday", label: "Wednesday", index: 3 },
  { key: "thursday", label: "Thursday", index: 4 },
  { key: "friday", label: "Friday", index: 5 },
  { key: "saturday", label: "Saturday", index: 6 },
  { key: "sunday", label: "Sunday", index: 0 },
] as const;

export interface ScheduleInput {
  day: string;
  startTime: string;
  endTime: string;
}

export interface ScheduleEntry {
  day: string;
  label: string;
  startTime: string | null;
  endTime: string | null;
  isActive: boolean;
}

function mapDayLabel(dayIndex: number) {
  return weekDays.find((day) => day.index === dayIndex)?.label ?? "Unknown";
}

function mapDayKey(dayIndex: number) {
  return weekDays.find((day) => day.index === dayIndex)?.key ?? "unknown";
}

function timeStringToMinutes(value: string | null | undefined) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function formatMinutes(minutes: number) {
  const normalizedHours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const normalizedMinutes = (minutes % 60).toString().padStart(2, "0");
  return `${normalizedHours}:${normalizedMinutes}`;
}

export async function ensureUserSchedule(userId: number) {
  const [existingRows] = await db.query(
    `SELECT day_of_week
     FROM intern_schedules
     WHERE user_id = ?`,
    [userId],
  );

  const existingDays = new Set((existingRows as any[]).map((row) => Number(row.day_of_week)));
  const missingDays = weekDays
    .map((day) => day.index)
    .filter((dayIndex) => !existingDays.has(dayIndex));

  for (const dayIndex of missingDays) {
    await db.execute(
      `INSERT INTO intern_schedules (user_id, day_of_week, start_time, end_time, is_active)
       VALUES (?, ?, NULL, NULL, 0)`,
      [userId, dayIndex],
    );
  }
}

export async function getUserSchedule(userId: number): Promise<ScheduleEntry[]> {
  await ensureUserSchedule(userId);

  const [rows] = await db.query(
    `SELECT day_of_week, start_time, end_time, is_active
     FROM intern_schedules
     WHERE user_id = ?
     ORDER BY FIELD(day_of_week, 1, 2, 3, 4, 5, 6, 0)`,
    [userId],
  );

  return (rows as any[]).map((row) => ({
    day: mapDayKey(Number(row.day_of_week)),
    label: mapDayLabel(Number(row.day_of_week)),
    startTime: row.start_time ? String(row.start_time).slice(0, 5) : null,
    endTime: row.end_time ? String(row.end_time).slice(0, 5) : null,
    isActive: Boolean(row.is_active),
  }));
}

export async function saveUserSchedule(userId: number, schedule: ScheduleInput[]) {
  await ensureUserSchedule(userId);

  for (const day of weekDays) {
    const matchingInput = schedule.find((entry) => entry.day === day.key);
    const hasTimes = Boolean(matchingInput?.startTime && matchingInput?.endTime);

    await db.execute(
      `UPDATE intern_schedules
       SET start_time = ?, end_time = ?, is_active = ?
       WHERE user_id = ? AND day_of_week = ?`,
      [
        hasTimes ? matchingInput?.startTime : null,
        hasTimes ? matchingInput?.endTime : null,
        hasTimes ? 1 : 0,
        userId,
        day.index,
      ],
    );
  }
}

export function getScheduleStatusForNow(
  schedule: ScheduleEntry | null,
  timeIn: string | Date | null,
  now = new Date(),
) {
  const lateGraceMinutes = 15;

  if (!schedule || !schedule.isActive || !schedule.startTime || !schedule.endTime) {
    return {
      code: "no-schedule",
      label: "No Schedule",
      detail: "No schedule set for today.",
    };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = timeStringToMinutes(schedule.startTime);
  const endMinutes = timeStringToMinutes(schedule.endTime);

  if (startMinutes == null || endMinutes == null) {
    return {
      code: "no-schedule",
      label: "No Schedule",
      detail: "No schedule set for today.",
    };
  }

  if (timeIn) {
    const recordedTime = new Date(timeIn);
    const recordedMinutes = recordedTime.getHours() * 60 + recordedTime.getMinutes();

    if (recordedMinutes > startMinutes + lateGraceMinutes) {
      return {
        code: "late",
        label: "Late",
        detail: `You clocked in after the ${schedule.startTime} start time and beyond the 15-minute grace period.`,
      };
    }

    if (recordedMinutes > startMinutes) {
      return {
        code: "grace",
        label: "Grace Period",
        detail: `You clocked in within the 15-minute grace period after ${schedule.startTime}.`,
      };
    }

    if (recordedMinutes < startMinutes) {
      return {
        code: "early",
        label: "Early",
        detail: `Clock-in was ahead of the ${schedule.startTime} schedule.`,
      };
    }

    return {
      code: "on-time",
      label: "On Time",
      detail: `You clocked in on schedule at ${schedule.startTime}.`,
    };
  }

  if (currentMinutes < startMinutes) {
    return {
      code: "early",
      label: "Early",
      detail: `Your shift starts at ${schedule.startTime}.`,
    };
  }

  if (currentMinutes <= startMinutes + lateGraceMinutes) {
    return {
      code: "grace",
      label: "Grace Period",
      detail: `You still have a 15-minute grace period to clock in for your ${schedule.startTime} shift.`,
    };
  }

  if (currentMinutes <= endMinutes) {
    return {
      code: "late",
      label: "Late",
      detail: `You are already late for your ${schedule.startTime} shift.`,
    };
  }

  return {
    code: "missed",
    label: "Missed Schedule",
    detail: `Your scheduled shift ended at ${schedule.endTime}.`,
  };
}

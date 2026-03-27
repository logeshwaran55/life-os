import type { Schedule, TimeBlock } from "../types/schedule";

const pad = (value: number): string => String(value).padStart(2, "0");

export const getTodayDate = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const createScheduleId = (): string => {
  return `schedule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const getTimeBlockFromStartTime = (startTime: string): TimeBlock => {
  const [hourRaw] = startTime.split(":");
  const hour = Number(hourRaw);

  if (!Number.isFinite(hour)) {
    return "morning";
  }

  if (hour < 12) {
    return "morning";
  }

  if (hour < 17) {
    return "afternoon";
  }

  return "evening";
};

export const getDefaultTimeRangeForBlock = (block: TimeBlock): { startTime: string; endTime: string } => {
  if (block === "morning") {
    return { startTime: "09:00", endTime: "10:00" };
  }

  if (block === "afternoon") {
    return { startTime: "14:00", endTime: "15:00" };
  }

  return { startTime: "18:00", endTime: "19:00" };
};

export const isScheduleOnDate = (schedule: Schedule, date: string): boolean => {
  return schedule.date === date;
};

export const compareSchedulesByStartTime = (a: Schedule, b: Schedule): number => {
  if (a.startTime === b.startTime) {
    return a.endTime.localeCompare(b.endTime);
  }

  return a.startTime.localeCompare(b.startTime);
};

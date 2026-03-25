import type { Task } from "../types/column";
import { calculateTaskScore } from "./intelligence.ts";

export type ScheduledSlot = {
  time: string;
  taskId: string;
};

export type ScheduleResult = {
  slots: ScheduledSlot[];
  unscheduledTaskIds: string[];
};

const START_HOUR = 9;
const END_HOUR = 18;

const toTimeLabel = (hour: number): string => {
  return `${String(hour).padStart(2, "0")}:00`;
};

const toDueTimestamp = (raw: unknown): number => {
  if (typeof raw !== "string" || !raw.trim()) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = new Date(raw).getTime();
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
};

const sortTasksForScheduling = (tasks: Task[], dateColumnId: string): Task[] => {
  return [...tasks].sort((a, b) => {
    const scoreA = calculateTaskScore(a, dateColumnId);
    const scoreB = calculateTaskScore(b, dateColumnId);
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    const dueA = toDueTimestamp(a.values[dateColumnId]);
    const dueB = toDueTimestamp(b.values[dateColumnId]);
    if (dueA !== dueB) {
      return dueA - dueB;
    }

    return a.id.localeCompare(b.id);
  });
};

const createDailySlots = (): string[] => {
  const times: string[] = [];
  for (let hour = START_HOUR; hour < END_HOUR; hour += 1) {
    times.push(toTimeLabel(hour));
  }
  return times;
};

/**
 * Basic scheduling engine.
 * 1) Picks pending tasks only
 * 2) Sorts by intelligence score (highest first)
 * 3) Assigns each task to the next available 1-hour slot from 09:00 to 18:00
 *
 * Extendable for future duration, breaks, and adaptive re-planning.
 */
export const generateScheduleWithMeta = (
  tasks: Task[],
  dateColumnId: string
): ScheduleResult => {
  const pending = tasks.filter((task) => !task.completed);
  const ordered = sortTasksForScheduling(pending, dateColumnId);
  const slots = createDailySlots();

  const scheduled = ordered.slice(0, slots.length).map((task, index) => ({
    time: slots[index],
    taskId: task.id,
  }));

  const unscheduledTaskIds = ordered.slice(slots.length).map((task) => task.id);

  return {
    slots: scheduled,
    unscheduledTaskIds,
  };
};

/**
 * Required public API for Phase 4.
 * Returns only the scheduled timeline entries.
 */
export const generateSchedule = (
  tasks: Task[],
  dateColumnId: string
): ScheduledSlot[] => {
  return generateScheduleWithMeta(tasks, dateColumnId).slots;
};

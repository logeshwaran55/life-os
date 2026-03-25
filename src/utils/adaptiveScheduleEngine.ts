import type { Task } from "../types/column";
import { calculateTaskScore } from "./intelligence.ts";

export type EnergyLevel = "high" | "medium" | "low";

export type AdaptiveScheduleEntry = {
  start: string;
  end: string;
  taskId: string | null;
  kind: "task" | "break";
  dayOffset: number;
  durationMinutes: number;
  priority?: "high" | "medium" | "low";
  score?: number;
};

export type AdaptiveScheduleResult = {
  timeline: AdaptiveScheduleEntry[];
  pushedToNextDayTaskIds: string[];
  unscheduledTaskIds: string[];
};

type RankedTask = {
  id: string;
  priority: "high" | "medium" | "low";
  score: number;
  remainingMinutes: number;
  scheduleRank: number | null;
};

type EnergyWindow = {
  energy: EnergyLevel;
  startMinutes: number;
  endMinutes: number;
};

type AdaptiveSchedulerOptions = {
  defaultDurationMinutes?: number;
  breakAfterFocusMinutes?: number;
  breakDurationMinutes?: number;
  planningDays?: number;
};

const DEFAULT_DURATION_MINUTES = 60;
const DEFAULT_BREAK_AFTER_FOCUS_MINUTES = 120;
const DEFAULT_BREAK_DURATION_MINUTES = 10;
const DEFAULT_PLANNING_DAYS = 3;

const ENERGY_WINDOWS: EnergyWindow[] = [
  { energy: "high", startMinutes: 9 * 60, endMinutes: 12 * 60 },
  { energy: "medium", startMinutes: 12 * 60, endMinutes: 16 * 60 },
  { energy: "low", startMinutes: 16 * 60, endMinutes: 20 * 60 },
];

const preferredEnergyForPriority = (
  priority: "high" | "medium" | "low"
): EnergyLevel => {
  if (priority === "high") return "high";
  if (priority === "medium") return "medium";
  return "low";
};

const formatTime = (minutesFromMidnight: number): string => {
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const normalizePriority = (raw: unknown): "high" | "medium" | "low" => {
  if (typeof raw !== "string") return "medium";
  const normalized = raw.trim().toLowerCase();
  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }

  return "medium";
};

const parseDurationMinutes = (
  raw: unknown,
  defaultDurationMinutes: number
): number => {
  const asNumber = typeof raw === "number" ? raw : Number(raw);
  if (Number.isNaN(asNumber) || asNumber <= 0) {
    return defaultDurationMinutes;
  }

  // Keep values in reasonable range for daily planning.
  return Math.min(Math.round(asNumber), 8 * 60);
};

const buildRankedPendingTasks = (
  tasks: Task[],
  dateColumnId: string,
  defaultDurationMinutes: number
): RankedTask[] => {
  const pending = tasks.filter((task) => !task.completed);

  const ranked = pending.map((task) => ({
    id: task.id,
    priority: normalizePriority(task.values.priority),
    score: calculateTaskScore(task, dateColumnId),
    remainingMinutes: parseDurationMinutes(task.values.duration, defaultDurationMinutes),
    scheduleRank:
      typeof task.values.scheduleRank === "number" && !Number.isNaN(task.values.scheduleRank)
        ? task.values.scheduleRank
        : null,
  }));

  ranked.sort((a, b) => {
    if (a.scheduleRank !== null || b.scheduleRank !== null) {
      if (a.scheduleRank !== null && b.scheduleRank !== null && a.scheduleRank !== b.scheduleRank) {
        return a.scheduleRank - b.scheduleRank;
      }

      if (a.scheduleRank !== null && b.scheduleRank === null) {
        return -1;
      }

      if (a.scheduleRank === null && b.scheduleRank !== null) {
        return 1;
      }
    }

    if (a.score !== b.score) {
      return b.score - a.score;
    }

    const priorityWeight: Record<"high" | "medium" | "low", number> = {
      high: 0,
      medium: 1,
      low: 2,
    };

    if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
      return priorityWeight[a.priority] - priorityWeight[b.priority];
    }

    return a.id.localeCompare(b.id);
  });

  return ranked;
};

const pickNextTaskIndex = (remaining: RankedTask[], energy: EnergyLevel): number => {
  const preferredIndex = remaining.findIndex(
    (task) => preferredEnergyForPriority(task.priority) === energy
  );

  if (preferredIndex >= 0) {
    return preferredIndex;
  }

  return remaining.length > 0 ? 0 : -1;
};

const allocateWindow = (
  window: EnergyWindow,
  dayOffset: number,
  remaining: RankedTask[],
  timeline: AdaptiveScheduleEntry[],
  breakAfterFocusMinutes: number,
  breakDurationMinutes: number
): void => {
  let cursor = window.startMinutes;
  let focusedSinceBreak = 0;

  while (cursor < window.endMinutes && remaining.length > 0) {
    const availableMinutes = window.endMinutes - cursor;
    if (availableMinutes <= 0) {
      break;
    }

    // Add a short break after sustained focus blocks.
    if (focusedSinceBreak >= breakAfterFocusMinutes && availableMinutes >= breakDurationMinutes) {
      const breakStart = cursor;
      const breakEnd = cursor + breakDurationMinutes;
      timeline.push({
        start: formatTime(breakStart),
        end: formatTime(breakEnd),
        taskId: null,
        kind: "break",
        dayOffset,
        durationMinutes: breakDurationMinutes,
      });
      cursor = breakEnd;
      focusedSinceBreak = 0;
      continue;
    }

    const taskIndex = pickNextTaskIndex(remaining, window.energy);
    if (taskIndex < 0) {
      break;
    }

    const task = remaining[taskIndex];
    const focusRemainingBeforeBreak = Math.max(
      1,
      breakAfterFocusMinutes - focusedSinceBreak
    );
    const allocatableMinutes = Math.min(
      task.remainingMinutes,
      availableMinutes,
      focusRemainingBeforeBreak
    );

    if (allocatableMinutes <= 0) {
      break;
    }

    const blockStart = cursor;
    const blockEnd = cursor + allocatableMinutes;

    timeline.push({
      start: formatTime(blockStart),
      end: formatTime(blockEnd),
      taskId: task.id,
      kind: "task",
      dayOffset,
      durationMinutes: allocatableMinutes,
      priority: task.priority,
      score: task.score,
    });

    cursor = blockEnd;
    focusedSinceBreak += allocatableMinutes;
    task.remainingMinutes -= allocatableMinutes;

    // If task is fully scheduled, remove it.
    if (task.remainingMinutes <= 0) {
      remaining.splice(taskIndex, 1);
    }
  }
};

/**
 * Adaptive scheduling engine.
 *
 * Decisions:
 * 1) Rank pending tasks by intelligence score.
 * 2) Match priority to energy windows:
 *    - high -> morning (09:00-12:00)
 *    - medium -> afternoon (12:00-16:00)
 *    - low -> evening (16:00-20:00)
 * 3) Allocate by duration (default 60m if missing).
 * 4) Insert 10m breaks every 2h of focused work.
 * 5) Continue unfinished tasks in the next available slot.
 * 6) Push overflow tasks to next day windows.
 */
export const generateAdaptiveSchedule = (
  tasks: Task[],
  dateColumnId: string,
  options: AdaptiveSchedulerOptions = {}
): AdaptiveScheduleResult => {
  const defaultDurationMinutes = options.defaultDurationMinutes ?? DEFAULT_DURATION_MINUTES;
  const breakAfterFocusMinutes =
    options.breakAfterFocusMinutes ?? DEFAULT_BREAK_AFTER_FOCUS_MINUTES;
  const breakDurationMinutes = options.breakDurationMinutes ?? DEFAULT_BREAK_DURATION_MINUTES;
  const planningDays = options.planningDays ?? DEFAULT_PLANNING_DAYS;

  const remaining = buildRankedPendingTasks(tasks, dateColumnId, defaultDurationMinutes);
  const originalTaskIds = new Set(remaining.map((task) => task.id));
  const timeline: AdaptiveScheduleEntry[] = [];

  for (let dayOffset = 0; dayOffset < planningDays; dayOffset += 1) {
    if (remaining.length === 0) {
      break;
    }

    ENERGY_WINDOWS.forEach((window) => {
      allocateWindow(
        window,
        dayOffset,
        remaining,
        timeline,
        breakAfterFocusMinutes,
        breakDurationMinutes
      );
    });
  }

  const pushedToNextDayTaskIds = Array.from(originalTaskIds).filter((taskId) => {
    const scheduledToday = timeline.some(
      (entry) => entry.dayOffset === 0 && entry.taskId === taskId
    );
    const scheduledLater = timeline.some(
      (entry) => entry.dayOffset > 0 && entry.taskId === taskId
    );

    return !scheduledToday && scheduledLater;
  });

  const unscheduledTaskIds = remaining.map((task) => task.id);

  return {
    timeline,
    pushedToNextDayTaskIds,
    unscheduledTaskIds,
  };
};

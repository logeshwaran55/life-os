import type { Task } from "../types/column";

export type SmartPriority = "low" | "medium" | "high";

export type EffectivePriorityResult = {
  priority: SmartPriority;
  reason: string;
};

export type WorkloadDay = {
  date: string;
  count: number;
};

export type WorkloadAnalysis = {
  tasksPerDay: number;
  pendingCount: number;
  overloadedDays: WorkloadDay[];
  recommendation: string;
};

export type StreakStats = {
  current: number;
  bestInData: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAILY_CAPACITY = 5;

const startOfDay = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInput = (raw: string): Date | null => {
  if (!raw.trim()) {
    return null;
  }

  const normalized = raw.includes("T") ? raw : `${raw}T00:00:00`;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return startOfDay(parsed);
};

export const getTaskTitle = (task: Task): string => {
  const raw = task.values.name;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }
  return "Untitled task";
};

export const normalizePriority = (value: unknown): SmartPriority => {
  if (typeof value !== "string") {
    return "medium";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }

  return "medium";
};

export const getTaskDueDate = (task: Task, dateColumnId: string): Date | null => {
  const raw = task.values[dateColumnId];
  if (typeof raw !== "string") {
    return null;
  }

  return parseDateInput(raw);
};

export const getDaysUntilDue = (task: Task, dateColumnId: string, now = new Date()): number | null => {
  const dueDate = getTaskDueDate(task, dateColumnId);
  if (!dueDate) {
    return null;
  }

  const today = startOfDay(now);
  return Math.round((dueDate.getTime() - today.getTime()) / DAY_MS);
};

export const calculateCompletionRate = (tasks: Task[]): number => {
  if (tasks.length === 0) {
    return 0;
  }

  const completedCount = tasks.filter((task) => task.completed).length;
  return Math.round((completedCount / tasks.length) * 100);
};

export const getEffectivePriority = (
  task: Task,
  dateColumnId: string,
  completionRate: number,
  now = new Date()
): EffectivePriorityResult => {
  if (task.completed) {
    return {
      priority: "low",
      reason: "Completed tasks are deprioritized.",
    };
  }

  const basePriority = normalizePriority(task.values.priority);
  const daysUntilDue = getDaysUntilDue(task, dateColumnId, now);

  if (daysUntilDue !== null && daysUntilDue < 0) {
    return {
      priority: "high",
      reason: "Task is overdue.",
    };
  }

  if (daysUntilDue === 0) {
    return {
      priority: completionRate >= 70 ? "medium" : "high",
      reason:
        completionRate >= 70
          ? "Task is due today, but completion trend is strong."
          : "Task is due today and needs immediate attention.",
    };
  }

  if (daysUntilDue !== null && daysUntilDue <= 2) {
    if (basePriority === "high" || completionRate < 40) {
      return {
        priority: "high",
        reason: "Upcoming deadline with low completion trend.",
      };
    }

    return {
      priority: "medium",
      reason: "Deadline is close.",
    };
  }

  if (completionRate < 35 && basePriority === "medium") {
    return {
      priority: "high",
      reason: "Low completion trend elevates this task.",
    };
  }

  if (completionRate >= 75 && basePriority === "high") {
    return {
      priority: "medium",
      reason: "High completion trend allows balanced prioritization.",
    };
  }

  return {
    priority: basePriority,
    reason: "Uses existing manual priority.",
  };
};

export const shouldIncludeInFocus = (
  task: Task,
  dateColumnId: string,
  effectivePriority: SmartPriority,
  now = new Date()
): boolean => {
  if (task.completed) {
    return false;
  }

  const daysUntilDue = getDaysUntilDue(task, dateColumnId, now);
  const isToday = daysUntilDue === 0;
  return isToday || effectivePriority === "high";
};

export const analyzeWorkload = (
  tasks: Task[],
  dateColumnId: string,
  now = new Date(),
  dailyCapacity = DEFAULT_DAILY_CAPACITY
): WorkloadAnalysis => {
  const pending = tasks.filter((task) => !task.completed);
  const pendingCount = pending.length;

  const today = startOfDay(now);
  const nextWeek = new Date(today.getTime() + 6 * DAY_MS);

  const bucket = new Map<string, number>();

  pending.forEach((task) => {
    const due = getTaskDueDate(task, dateColumnId);
    if (!due) {
      return;
    }

    if (due < today || due > nextWeek) {
      return;
    }

    const key = toDateKey(due);
    bucket.set(key, (bucket.get(key) ?? 0) + 1);
  });

  const dayEntries = Array.from(bucket.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const overloadedDays = dayEntries.filter((entry) => entry.count > dailyCapacity);
  const tasksPerDay = Number((pendingCount / 7).toFixed(1));

  let recommendation = "Workload is manageable this week.";
  if (overloadedDays.length > 0) {
    recommendation = `Redistribute tasks from ${overloadedDays[0].date} to lighter days.`;
  } else if (tasksPerDay > dailyCapacity) {
    recommendation = "Task volume is high. Consider splitting work across more days.";
  }

  return {
    tasksPerDay,
    pendingCount,
    overloadedDays,
    recommendation,
  };
};

export const calculateCompletionStreak = (tasks: Task[], now = new Date()): StreakStats => {
  const completionDates = new Set<string>();

  tasks.forEach((task) => {
    if (!task.completedAt) {
      return;
    }

    const parsed = parseDateInput(task.completedAt);
    if (!parsed) {
      return;
    }

    completionDates.add(toDateKey(parsed));
  });

  if (completionDates.size === 0) {
    return { current: 0, bestInData: 0 };
  }

  let current = 0;
  let cursor = startOfDay(now);

  while (completionDates.has(toDateKey(cursor))) {
    current += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  const ordered = Array.from(completionDates)
    .map((key) => startOfDay(new Date(`${key}T00:00:00`)))
    .sort((a, b) => a.getTime() - b.getTime());

  let best = 1;
  let chain = 1;

  for (let i = 1; i < ordered.length; i += 1) {
    const diff = Math.round((ordered[i].getTime() - ordered[i - 1].getTime()) / DAY_MS);
    if (diff === 1) {
      chain += 1;
      if (chain > best) {
        best = chain;
      }
    } else {
      chain = 1;
    }
  }

  return {
    current,
    bestInData: best,
  };
};

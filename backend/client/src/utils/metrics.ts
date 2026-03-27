import type { Column, Task } from "../types/column";

export type CoreMetrics = {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionPercentage: number;
};

export type TimeMetrics = {
  completedToday: number;
  overdueTasks: number;
  dueToday: number;
};

export type DailyTrendPoint = {
  date: string;
  count: number;
};

export type BehaviorMetrics = {
  last7DaysTrend: DailyTrendPoint[];
  currentStreak: number;
  longestStreak: number;
  averageCompletionHours: number | null;
};

export type TrackingMetrics = {
  core: CoreMetrics;
  time: TimeMetrics;
  behavior: BehaviorMetrics;
  insights: string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

const isSameDay = (a: Date, b: Date): boolean => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const getDueDateColumnId = (columns: Column[]): string | null => {
  const explicitDueDate = columns.find((column) => column.id === "dueDate");
  if (explicitDueDate) return explicitDueDate.id;

  const firstDateColumn = columns.find((column) => column.type === "date");
  return firstDateColumn ? firstDateColumn.id : null;
};

const getDayKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const toStartOfDay = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const calculateCoreMetrics = (tasks: Task[]): CoreMetrics => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionPercentage =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return {
    totalTasks,
    completedTasks,
    pendingTasks,
    completionPercentage,
  };
};

export const calculateTimeMetrics = (tasks: Task[], columns: Column[]): TimeMetrics => {
  const now = new Date();
  const dueDateColumnId = getDueDateColumnId(columns);

  const completedToday = tasks.filter((task) => {
    if (!task.completed || !task.completedAt) return false;
    const completedAt = new Date(task.completedAt);
    if (Number.isNaN(completedAt.getTime())) return false;
    return isSameDay(completedAt, now);
  }).length;

  let overdueTasks = 0;
  let dueToday = 0;

  if (dueDateColumnId) {
    tasks.forEach((task) => {
      const dueRaw = task.values[dueDateColumnId];
      if (typeof dueRaw !== "string" || !dueRaw) return;

      const dueDate = new Date(dueRaw);
      if (Number.isNaN(dueDate.getTime())) return;

      const dueDateOnly = new Date(dueDate);
      dueDateOnly.setHours(0, 0, 0, 0);

      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      if (!task.completed && dueDateOnly < today) {
        overdueTasks += 1;
      }

      if (isSameDay(dueDateOnly, today)) {
        dueToday += 1;
      }
    });
  }

  return {
    completedToday,
    overdueTasks,
    dueToday,
  };
};

export const generateInsights = (core: CoreMetrics, time: TimeMetrics): string[] => {
  const insights: string[] = [];

  if (time.overdueTasks > 0) {
    insights.push("You have overdue tasks. Consider tackling them first.");
  }

  if (core.completionPercentage >= 70) {
    insights.push("Great momentum. You are making strong progress.");
  } else if (core.completionPercentage <= 30 && core.totalTasks >= 5) {
    insights.push("You are falling behind. Try completing a few quick tasks.");
  }

  if (time.completedToday >= 3) {
    insights.push("Good progress today. Keep the streak going.");
  }

  if (time.dueToday > 0) {
    insights.push(`You have ${time.dueToday} task${time.dueToday === 1 ? "" : "s"} due today.`);
  }

  if (insights.length === 0) {
    insights.push("Steady pace. Keep adding and completing tasks.");
  }

  return insights;
};

export const calculateLast7DaysTrend = (tasks: Task[]): DailyTrendPoint[] => {
  const now = new Date();
  const dayBuckets = new Map<string, number>();

  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    dayBuckets.set(getDayKey(day), 0);
  }

  tasks.forEach((task) => {
    if (!task.completed || !task.completedAt) return;
    const completedAt = new Date(task.completedAt);
    if (Number.isNaN(completedAt.getTime())) return;

    const key = getDayKey(completedAt);
    if (!dayBuckets.has(key)) return;

    dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
  });

  return Array.from(dayBuckets.entries()).map(([key, count]) => {
    const date = new Date(`${key}T00:00:00`);
    return {
      date: date.toLocaleDateString("en-US", { weekday: "short" }),
      count,
    };
  });
};

export const calculateStreakMetrics = (
  tasks: Task[]
): Pick<BehaviorMetrics, "currentStreak" | "longestStreak"> => {
  const completionDaySet = new Set<string>();

  tasks.forEach((task) => {
    if (!task.completed || !task.completedAt) return;
    const completedAt = new Date(task.completedAt);
    if (Number.isNaN(completedAt.getTime())) return;
    completionDaySet.add(getDayKey(completedAt));
  });

  const today = toStartOfDay(new Date());
  let currentStreak = 0;
  for (let offset = 0; offset < 3650; offset += 1) {
    const day = new Date(today.getTime() - offset * DAY_MS);
    const key = getDayKey(day);
    if (!completionDaySet.has(key)) break;
    currentStreak += 1;
  }

  const sortedDays = Array.from(completionDaySet)
    .map((key) => new Date(`${key}T00:00:00`).getTime())
    .sort((a, b) => a - b);

  let longestStreak = 0;
  let running = 0;
  let previous: number | null = null;

  sortedDays.forEach((time) => {
    if (previous === null || time - previous === DAY_MS) {
      running += 1;
    } else {
      running = 1;
    }

    if (running > longestStreak) {
      longestStreak = running;
    }

    previous = time;
  });

  return {
    currentStreak,
    longestStreak,
  };
};

export const calculateAverageCompletionHours = (tasks: Task[]): number | null => {
  const durationsInHours = tasks
    .filter((task) => task.completed && task.completedAt)
    .map((task) => {
      const createdAt = new Date(task.createdAt);
      const completedAt = new Date(task.completedAt as string);
      if (Number.isNaN(createdAt.getTime()) || Number.isNaN(completedAt.getTime())) {
        return null;
      }

      const diffMs = completedAt.getTime() - createdAt.getTime();
      if (diffMs < 0) return null;

      return diffMs / (1000 * 60 * 60);
    })
    .filter((value): value is number => value !== null);

  if (durationsInHours.length === 0) {
    return null;
  }

  const total = durationsInHours.reduce((sum, value) => sum + value, 0);
  return Number((total / durationsInHours.length).toFixed(1));
};

export const calculateTrackingMetrics = (
  tasks: Task[],
  columns: Column[]
): TrackingMetrics => {
  const core = calculateCoreMetrics(tasks);
  const time = calculateTimeMetrics(tasks, columns);
  const last7DaysTrend = calculateLast7DaysTrend(tasks);
  const streak = calculateStreakMetrics(tasks);
  const averageCompletionHours = calculateAverageCompletionHours(tasks);
  const behavior: BehaviorMetrics = {
    last7DaysTrend,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    averageCompletionHours,
  };
  const insights = generateInsights(core, time);

  return { core, time, behavior, insights };
};

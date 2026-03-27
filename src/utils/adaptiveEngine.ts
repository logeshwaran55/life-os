import type { Task } from "../types/column";

export type PreferredTime = "morning" | "afternoon" | "evening";
export type ProductivityLevel = "low" | "medium" | "high";
export type InsightType = "warning" | "success" | "info";
export type AdaptivePriority = "low" | "medium" | "high";

export type UserBehavior = {
  avgCompletedPerDay: number;
  preferredTime: PreferredTime;
  completionRate: number;
};

export type PatternDetection = {
  overloaded: boolean;
  consistency: ProductivityLevel;
  productivityLevel: ProductivityLevel;
  currentStreak: number;
};

export type WorkloadSuggestion = {
  recommendedMin: number;
  recommendedMax: number;
  message: string;
};

export type AdaptiveInsight = {
  id: string;
  type: InsightType;
  message: string;
  detail?: string;
};

export type AdaptiveIntelligenceResult = {
  behavior: UserBehavior;
  patterns: PatternDetection;
  workload: WorkloadSuggestion;
  insights: AdaptiveInsight[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const parseDate = (raw: unknown): Date | null => {
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }

  const normalized = raw.includes("T") ? raw : `${raw}T00:00:00`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const formatDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const getDaysUntilDue = (task: Task, dateColumnId: string, now = new Date()): number | null => {
  const due = parseDate(task.values[dateColumnId]);
  if (!due) {
    return null;
  }

  const dueDay = startOfDay(due);
  const today = startOfDay(now);
  return Math.round((dueDay.getTime() - today.getTime()) / DAY_MS);
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const calculateCurrentStreak = (tasks: Task[], now = new Date()): number => {
  const completionDays = new Set<string>();

  tasks.forEach((task) => {
    const completedAt = parseDate(task.completedAt);
    if (!completedAt) {
      return;
    }

    completionDays.add(formatDateKey(startOfDay(completedAt)));
  });

  let streak = 0;
  let cursor = startOfDay(now);

  while (completionDays.has(formatDateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  return streak;
};

/**
 * Analyze user behavior from historical task completion data.
 */
export const analyzeUserBehavior = (tasks: Task[]): UserBehavior => {
  const completedTasks = tasks.filter((task) => task.completed && task.completedAt);

  const completionRate = tasks.length === 0
    ? 0
    : Math.round((completedTasks.length / tasks.length) * 100);

  const completionByDay = new Map<string, number>();
  const timeBuckets: Record<PreferredTime, number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
  };

  completedTasks.forEach((task) => {
    const completedAt = parseDate(task.completedAt);
    if (!completedAt) {
      return;
    }

    const dayKey = formatDateKey(startOfDay(completedAt));
    completionByDay.set(dayKey, (completionByDay.get(dayKey) ?? 0) + 1);

    const hour = completedAt.getHours();
    if (hour < 12) {
      timeBuckets.morning += 1;
    } else if (hour < 18) {
      timeBuckets.afternoon += 1;
    } else {
      timeBuckets.evening += 1;
    }
  });

  const daysWithCompletion = completionByDay.size || 1;
  const avgCompletedPerDay = Number((completedTasks.length / daysWithCompletion).toFixed(1));

  const preferredTime = (Object.entries(timeBuckets) as Array<[PreferredTime, number]>)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "afternoon";

  return {
    avgCompletedPerDay,
    preferredTime,
    completionRate,
  };
};

/**
 * Detect workload and productivity patterns.
 */
export const detectPatterns = (tasks: Task[], behavior: UserBehavior): PatternDetection => {
  const pendingCount = tasks.filter((task) => !task.completed).length;
  const currentStreak = calculateCurrentStreak(tasks);

  const overloaded = pendingCount > Math.max(10, Math.round(behavior.avgCompletedPerDay * 3))
    && behavior.completionRate < 55;

  let consistency: ProductivityLevel = "low";
  if (currentStreak >= 5) {
    consistency = "high";
  } else if (currentStreak >= 2) {
    consistency = "medium";
  }

  let productivityLevel: ProductivityLevel = "low";
  if (behavior.completionRate >= 70 && behavior.avgCompletedPerDay >= 4) {
    productivityLevel = "high";
  } else if (behavior.completionRate >= 40 && behavior.avgCompletedPerDay >= 2) {
    productivityLevel = "medium";
  }

  return {
    overloaded,
    consistency,
    productivityLevel,
    currentStreak,
  };
};

/**
 * Adaptive priority based on task urgency + user behavior.
 */
export const getAdaptivePriority = (
  task: Task,
  behavior: UserBehavior,
  dateColumnId: string,
  now = new Date()
): AdaptivePriority => {
  if (task.completed) {
    return "low";
  }

  const daysUntilDue = getDaysUntilDue(task, dateColumnId, now);

  if (daysUntilDue !== null && daysUntilDue < 0 && behavior.completionRate < 50) {
    return "high";
  }

  if (daysUntilDue !== null && daysUntilDue <= 1) {
    return "high";
  }

  if (daysUntilDue !== null && daysUntilDue <= 3) {
    return behavior.completionRate < 45 ? "high" : "medium";
  }

  if (behavior.completionRate < 40) {
    return "low";
  }

  return behavior.avgCompletedPerDay >= 4 ? "medium" : "low";
};

/**
 * Suggest a realistic workload target for today.
 */
export const suggestWorkload = (tasks: Task[], behavior: UserBehavior): WorkloadSuggestion => {
  const pendingCount = tasks.filter((task) => !task.completed).length;
  const baseline = clamp(Math.round(behavior.avgCompletedPerDay || 1), 1, 10);

  let recommendedMin = Math.max(1, baseline - 1);
  let recommendedMax = baseline + 1;

  if (behavior.completionRate < 40) {
    recommendedMin = Math.max(1, baseline - 2);
    recommendedMax = baseline;
  } else if (behavior.completionRate > 70) {
    recommendedMin = baseline;
    recommendedMax = baseline + 2;
  }

  recommendedMax = Math.min(recommendedMax, pendingCount || recommendedMax);
  recommendedMin = Math.min(recommendedMin, recommendedMax);

  return {
    recommendedMin,
    recommendedMax,
    message: `You usually complete ${behavior.avgCompletedPerDay} tasks/day, limit today's plan to ${recommendedMin}-${recommendedMax} tasks.`,
  };
};

/**
 * Build adaptive insights from behavior + patterns.
 */
export const generateAdaptiveInsights = (
  behavior: UserBehavior,
  patterns: PatternDetection,
  workload: WorkloadSuggestion
): AdaptiveInsight[] => {
  const insights: AdaptiveInsight[] = [];

  insights.push({
    id: "preferred-time",
    type: "info",
    message: `You work best in ${behavior.preferredTime}s`,
    detail: "Schedule your highest-impact tasks during this window.",
  });

  if (patterns.overloaded) {
    insights.push({
      id: "overload",
      type: "warning",
      message: "Reduce task load today",
      detail: workload.message,
    });
  }

  if (patterns.consistency === "high" || patterns.currentStreak >= 3) {
    insights.push({
      id: "consistency-improving",
      type: "success",
      message: "You're improving consistency",
      detail: `Current streak: ${patterns.currentStreak} day${patterns.currentStreak === 1 ? "" : "s"}.`,
    });
  }

  if (patterns.productivityLevel === "low") {
    insights.push({
      id: "productivity-low",
      type: "warning",
      message: "Productivity is currently low",
      detail: "Focus on fewer urgent tasks to rebuild momentum.",
    });
  } else if (patterns.productivityLevel === "high") {
    insights.push({
      id: "productivity-high",
      type: "success",
      message: "Productivity level is high",
      detail: "You can safely take on slightly more planned tasks.",
    });
  }

  if (insights.length === 1) {
    insights.push({
      id: "stable",
      type: "info",
      message: "Adaptive system is stable",
      detail: "No major behavior risks detected right now.",
    });
  }

  return insights;
};

/**
 * Main orchestrator for adaptive intelligence.
 */
export const generateAdaptiveIntelligence = (
  tasks: Task[],
  _dateColumnId: string
): AdaptiveIntelligenceResult => {
  void _dateColumnId;

  const behavior = analyzeUserBehavior(tasks);
  const patterns = detectPatterns(tasks, behavior);
  const workload = suggestWorkload(tasks, behavior);
  const insights = generateAdaptiveInsights(behavior, patterns, workload);

  return {
    behavior,
    patterns,
    workload,
    insights,
  };
};

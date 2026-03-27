import type { Task } from "../types/column";

export type SmartPriority = "low" | "medium" | "high";
export type InsightType = "warning" | "success" | "info";

export type SmartInsight = {
  id: string;
  type: InsightType;
  message: string;
  detail?: string;
  actionText?: string;
};

export type RecommendedTask = {
  id: string;
  title: string;
  dueDate: string | null;
  reason: string;
  score: number;
};

export type WorkloadAnalysis = {
  tasksPerDay: number;
  overloadedDays: Array<{ date: string; count: number }>;
  recommendation: string;
};

export type StreakStats = {
  current: number;
  bestInData: number;
};

export type SmartEngineResult = {
  insights: SmartInsight[];
  nextTask: RecommendedTask | null;
  effectivePriorityByTaskId: Record<string, SmartPriority>;
  focusTaskIds: string[];
  workload: WorkloadAnalysis;
  streak: StreakStats;
  completionRate: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const toStartOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const parseTaskDate = (raw: unknown): Date | null => {
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }

  const normalized = raw.includes("T") ? raw : `${raw}T00:00:00`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toStartOfDay(parsed);
};

const getDueDateFromTask = (task: Task, dateColumnId = "dueDate"): Date | null => {
  return parseTaskDate(task.values[dateColumnId]);
};

const getDaysUntilDue = (task: Task, dateColumnId = "dueDate", now = new Date()): number | null => {
  const dueDate = getDueDateFromTask(task, dateColumnId);
  if (!dueDate) {
    return null;
  }

  const today = toStartOfDay(now);
  return Math.round((dueDate.getTime() - today.getTime()) / DAY_MS);
};

const getTaskTitle = (task: Task): string => {
  const raw = task.values.name;
  return typeof raw === "string" && raw.trim() ? raw.trim() : "Untitled task";
};

const completionRate = (tasks: Task[]): number => {
  if (tasks.length === 0) {
    return 0;
  }
  const completed = tasks.filter((task) => task.completed).length;
  return Math.round((completed / tasks.length) * 100);
};

/**
 * Smart insights rules:
 * - overdue -> warning
 * - completion <30 and tasks >5 -> warning
 * - completion >70 -> success
 * - pending >10 -> warning
 * - fallback -> info
 */
export const generateSmartInsights = (
  tasks: Task[],
  dateColumnId = "dueDate",
  now = new Date()
): SmartInsight[] => {
  const pendingTasks = tasks.filter((task) => !task.completed);
  const overdueCount = pendingTasks.filter((task) => {
    const days = getDaysUntilDue(task, dateColumnId, now);
    return days !== null && days < 0;
  }).length;
  const rate = completionRate(tasks);

  const insights: SmartInsight[] = [];

  if (overdueCount > 0) {
    insights.push({
      id: "overdue-warning",
      type: "warning",
      message: "You are falling behind",
      detail: `${overdueCount} overdue task${overdueCount === 1 ? "" : "s"} detected.`,
    });
  }

  if (tasks.length > 5 && rate < 30) {
    insights.push({
      id: "completion-warning",
      type: "warning",
      message: "Completion trend is low",
      detail: `Only ${rate}% completion with ${tasks.length} tasks in the system.`,
    });
  }

  if (pendingTasks.length > 10) {
    insights.push({
      id: "overload-warning",
      type: "warning",
      message: "Overload warning",
      detail: `${pendingTasks.length} pending tasks. Focus mode recommended.`,
    });
  }

  if (rate > 70) {
    insights.push({
      id: "great-progress",
      type: "success",
      message: "Great progress",
      detail: `${rate}% completion rate. Keep momentum going.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "on-track",
      type: "info",
      message: "You're on track",
      detail: "No major risks detected right now.",
    });
  }

  return insights;
};

/**
 * Smart priority rules:
 * - overdue -> high
 * - due today/tomorrow -> high
 * - due in 2-3 days -> medium
 * - else -> low
 */
export const adjustPriority = (
  task: Task,
  dateColumnId = "dueDate",
  now = new Date()
): SmartPriority => {
  if (task.completed) {
    return "low";
  }

  const days = getDaysUntilDue(task, dateColumnId, now);
  if (days === null) {
    return "low";
  }
  if (days < 0) {
    return "high";
  }
  if (days <= 1) {
    return "high";
  }
  if (days <= 3) {
    return "medium";
  }
  return "low";
};

/**
 * Focus mode tasks:
 * - not completed
 * - effective high priority
 */
export const getFocusTasks = (
  tasks: Task[],
  dateColumnId = "dueDate",
  now = new Date()
): Task[] => {
  return tasks.filter(
    (task) => !task.completed && adjustPriority(task, dateColumnId, now) === "high"
  );
};

/**
 * Streak = number of unique days with at least one completed task.
 */
export const calculateStreak = (tasks: Task[]): number => {
  const completedDays = new Set<string>();

  tasks.forEach((task) => {
    if (!task.completedAt) {
      return;
    }

    const date = parseTaskDate(task.completedAt);
    if (!date) {
      return;
    }

    const key = date.toISOString().slice(0, 10);
    completedDays.add(key);
  });

  return completedDays.size;
};

const analyzeWorkload = (
  tasks: Task[],
  dateColumnId = "dueDate",
  now = new Date()
): WorkloadAnalysis => {
  const pending = tasks.filter((task) => !task.completed);
  const tasksPerDay = Number((pending.length / 7).toFixed(1));

  const today = toStartOfDay(now);
  const buckets = new Map<string, number>();
  pending.forEach((task) => {
    const due = getDueDateFromTask(task, dateColumnId);
    if (!due) {
      return;
    }

    const days = Math.round((due.getTime() - today.getTime()) / DAY_MS);
    if (days < 0 || days > 6) {
      return;
    }

    const key = due.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  });

  const overloadedDays = Array.from(buckets.entries())
    .map(([date, count]) => ({ date, count }))
    .filter((entry) => entry.count > 5)
    .sort((a, b) => a.date.localeCompare(b.date));

  const recommendation = overloadedDays.length > 0
    ? `Redistribute tasks from ${overloadedDays[0].date} to lighter days.`
    : "Workload is manageable this week.";

  return {
    tasksPerDay,
    overloadedDays,
    recommendation,
  };
};

const getNextRecommendedTask = (
  tasks: Task[],
  dateColumnId = "dueDate",
  now = new Date()
): RecommendedTask | null => {
  const pending = tasks.filter((task) => !task.completed);
  if (pending.length === 0) {
    return null;
  }

  const scored = pending.map((task) => {
    const priority = adjustPriority(task, dateColumnId, now);
    const days = getDaysUntilDue(task, dateColumnId, now);

    let score = priority === "high" ? 90 : priority === "medium" ? 60 : 30;
    if (days !== null && days < 0) {
      score += 20;
    }

    return { task, score, priority };
  });

  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0];

  return {
    id: winner.task.id,
    title: getTaskTitle(winner.task),
    dueDate: typeof winner.task.values[dateColumnId] === "string"
      ? (winner.task.values[dateColumnId] as string)
      : null,
    reason: winner.priority === "high" ? "Urgent due-date window." : "Best available next step.",
    score: winner.score,
  };
};

/**
 * Compatibility orchestrator used by current UI.
 */
export const generateSmartEngine = (
  tasks: Task[],
  dateColumnId: string,
  now = new Date()
): SmartEngineResult => {
  const insights = generateSmartInsights(tasks, dateColumnId, now);
  const nextTask = getNextRecommendedTask(tasks, dateColumnId, now);
  const focusTasks = getFocusTasks(tasks, dateColumnId, now);
  const rate = completionRate(tasks);
  const uniqueStreakDays = calculateStreak(tasks);

  const effectivePriorityByTaskId: Record<string, SmartPriority> = {};
  tasks.forEach((task) => {
    effectivePriorityByTaskId[task.id] = adjustPriority(task, dateColumnId, now);
  });

  return {
    insights,
    nextTask,
    effectivePriorityByTaskId,
    focusTaskIds: focusTasks.map((task) => task.id),
    workload: analyzeWorkload(tasks, dateColumnId, now),
    streak: {
      current: uniqueStreakDays,
      bestInData: uniqueStreakDays,
    },
    completionRate: rate,
  };
};

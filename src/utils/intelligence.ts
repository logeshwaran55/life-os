import type { Task } from "../types/column";

export type InsightSeverity = "high" | "medium" | "low" | "positive";

export type SmartInsight = {
  id: string;
  message: string;
  severity: InsightSeverity;
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

export type SmartInsightsResult = {
  insights: SmartInsight[];
  nextTask: RecommendedTask | null;
};

const toStartOfDay = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const getTaskTitle = (task: Task): string => {
  const raw = task.values.name;
  return typeof raw === "string" && raw.trim() ? raw : "Untitled task";
};

const getTaskPriority = (task: Task): "high" | "medium" | "low" => {
  const raw = task.values.priority;
  const normalized = typeof raw === "string" ? raw.trim().toLowerCase() : "medium";

  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }

  return "medium";
};

const getTaskDueDate = (task: Task, dateColumnId: string): string | null => {
  const raw = task.values[dateColumnId];
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }

  return raw;
};

const getDaysUntilDue = (task: Task, dateColumnId: string): number | null => {
  const dueDate = getTaskDueDate(task, dateColumnId);
  if (!dueDate) return null;

  const due = toStartOfDay(new Date(dueDate));
  if (Number.isNaN(due.getTime())) return null;

  const today = toStartOfDay(new Date());
  const diffMs = due.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

/**
 * Task scoring engine.
 *
 * Rules:
 * - Priority: high +30, medium +20, low +10
 * - Due date urgency: overdue +40, today +30, 1-3 days +20
 * - Pending bonus: not completed +10
 */
export const calculateTaskScore = (task: Task, dateColumnId: string): number => {
  let score = 0;

  const priority = getTaskPriority(task);
  if (priority === "high") score += 30;
  else if (priority === "medium") score += 20;
  else score += 10;

  const daysUntilDue = getDaysUntilDue(task, dateColumnId);
  if (daysUntilDue !== null) {
    if (daysUntilDue < 0) {
      score += 40;
    } else if (daysUntilDue === 0) {
      score += 30;
    } else if (daysUntilDue <= 3) {
      score += 20;
    }
  }

  if (!task.completed) {
    score += 10;
  }

  return score;
};

/**
 * Pick the next best task using the scoring engine.
 * 1) Keep only pending tasks
 * 2) Sort by highest score
 * 3) Use nearest due date as tie breaker
 */
export const getNextBestTask = (
  tasks: Task[],
  dateColumnId: string
): RecommendedTask | null => {
  const pending = tasks.filter((task) => !task.completed);
  if (pending.length === 0) {
    return null;
  }

  const ranked = [...pending].sort((a, b) => {
    const scoreA = calculateTaskScore(a, dateColumnId);
    const scoreB = calculateTaskScore(b, dateColumnId);

    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    const dueA = getTaskDueDate(a, dateColumnId);
    const dueB = getTaskDueDate(b, dateColumnId);

    const dueATime = dueA ? new Date(dueA).getTime() : Number.POSITIVE_INFINITY;
    const dueBTime = dueB ? new Date(dueB).getTime() : Number.POSITIVE_INFINITY;

    return dueATime - dueBTime;
  });

  const selected = ranked[0];
  const score = calculateTaskScore(selected, dateColumnId);
  const dueDate = getTaskDueDate(selected, dateColumnId);
  const daysUntilDue = getDaysUntilDue(selected, dateColumnId);

  let reason = "Highest overall score based on priority and urgency.";
  if (daysUntilDue !== null) {
    if (daysUntilDue < 0) {
      reason = "Overdue and high priority. Best task to tackle now.";
    } else if (daysUntilDue === 0) {
      reason = "Due today with strong score. Complete it now.";
    } else if (daysUntilDue <= 3) {
      reason = "Approaching deadline and strong score.";
    }
  }

  return {
    id: selected.id,
    title: getTaskTitle(selected),
    dueDate,
    reason,
    score,
  };
};

export const generateSmartInsights = (
  tasks: Task[],
  dateColumnId: string
): SmartInsightsResult => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.completed).length;
  const pendingTasks = totalTasks - completedTasks;

  const completionRate =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const overdueCount = tasks.filter((task) => {
    if (task.completed) return false;
    const daysUntilDue = getDaysUntilDue(task, dateColumnId);
    return daysUntilDue !== null && daysUntilDue < 0;
  }).length;

  const insights: SmartInsight[] = [];

  if (overdueCount > 0) {
    insights.push({
      id: "overdue-count",
      message: `You have ${overdueCount} overdue task${overdueCount === 1 ? "" : "s"}.`,
      severity: "high",
    });
  }

  if (completionRate <= 35 && totalTasks >= 5 && pendingTasks > completedTasks) {
    insights.push({
      id: "falling-behind",
      message: "You are falling behind. Clear a few high-score tasks first.",
      severity: "high",
    });
  }

  if (completionRate >= 70) {
    insights.push({
      id: "great-progress",
      message: "Great progress, keep going.",
      severity: "positive",
    });
  }

  const nextTask = getNextBestTask(tasks, dateColumnId);
  if (nextTask) {
    insights.push({
      id: "next-task",
      message: `Next: ${nextTask.title}`,
      severity: "medium",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "steady-progress",
      message: "Steady pace. Complete one pending task to build momentum.",
      severity: "low",
    });
  }

  const severityOrder: Record<InsightSeverity, number> = {
    high: 0,
    medium: 1,
    low: 2,
    positive: 3,
  };

  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    insights,
    nextTask,
  };
};

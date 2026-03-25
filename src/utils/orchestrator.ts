import type { Task } from "../types/column";
import { generateSmartEngine, type SmartInsight } from "./smartEngine";
import {
  generateAdaptiveIntelligence,
  type AdaptiveInsight,
  type AdaptiveIntelligenceResult,
  type WorkloadSuggestion,
} from "./adaptiveEngine";
import {
  generateAdaptiveSchedule,
  type AdaptiveScheduleResult,
  type AdaptiveScheduleEntry,
} from "./adaptiveScheduleEngine";

export type SystemState = "focus" | "overload" | "balanced";

export type SystemInsight = {
  id: string;
  type: "warning" | "success" | "info";
  message: string;
  detail?: string;
};

export type OrchestratorResult = {
  systemState: SystemState;
  insights: SystemInsight[];
  focusTasks: Task[];
  suggestedWorkload: WorkloadSuggestion;
  nextBestTask: {
    id: string;
    title: string;
    reason: string;
    score: number;
    dueDate: string | null;
  } | null;
  schedule: AdaptiveScheduleResult;
  recommendations: {
    systemRecommendation: string;
    nextAction: string;
    todaysPlan: string;
  };
};

const toSystemInsight = (
  source: SmartInsight | AdaptiveInsight,
  prefix: string
): SystemInsight => ({
  id: `${prefix}-${source.id}`,
  type: source.type,
  message: source.message,
  detail: source.detail,
});

const sortInsightPriority = (insights: SystemInsight[]): SystemInsight[] => {
  const order: Record<SystemInsight["type"], number> = {
    warning: 0,
    info: 1,
    success: 2,
  };

  return [...insights].sort((a, b) => order[a.type] - order[b.type]);
};

const countTodayTaskBlocks = (timeline: AdaptiveScheduleEntry[]): number =>
  timeline.filter((entry) => entry.dayOffset === 0 && entry.kind === "task").length;

const limitFocusTasks = (
  tasks: Task[],
  maxTasks: number
): Task[] => {
  return tasks.slice(0, Math.max(1, maxTasks));
};

/**
 * System Orchestrator
 * Central brain that combines Smart Engine, Adaptive Engine, and Scheduler.
 */
export const runSystem = (
  tasks: Task[],
  dateColumnId = "dueDate"
): OrchestratorResult => {
  const smart = generateSmartEngine(tasks, dateColumnId);
  const adaptive: AdaptiveIntelligenceResult = generateAdaptiveIntelligence(tasks, dateColumnId);
  const schedule = generateAdaptiveSchedule(tasks, dateColumnId);

  const focusTaskSet = new Set(smart.focusTaskIds);
  let focusTasks = tasks.filter((task) => focusTaskSet.has(task.id));

  const hasOverload = adaptive.patterns.overloaded;
  const hasOverdue = smart.insights.some((insight) => insight.id === "overdue-warning");
  const lowPerformance = adaptive.behavior.completionRate < 40;

  if (hasOverload) {
    focusTasks = limitFocusTasks(focusTasks, adaptive.workload.recommendedMax);
  }

  if (lowPerformance) {
    // Simplify plan further when performance trend is low.
    focusTasks = limitFocusTasks(focusTasks, Math.min(3, adaptive.workload.recommendedMax));
  }

  let systemState: SystemState = "balanced";
  if (hasOverload) {
    systemState = "overload";
  } else if (hasOverdue || lowPerformance || focusTasks.length > 0) {
    systemState = "focus";
  }

  const insights = sortInsightPriority([
    ...smart.insights.map((insight) => toSystemInsight(insight, "smart")),
    ...adaptive.insights.map((insight) => toSystemInsight(insight, "adaptive")),
  ]);

  let systemRecommendation = "System is balanced. Continue planned execution.";
  if (systemState === "overload") {
    systemRecommendation =
      `System detected overload. Reduce today's scope to ${adaptive.workload.recommendedMin}-${adaptive.workload.recommendedMax} tasks.`;
  } else if (systemState === "focus") {
    systemRecommendation = "System recommends Focus Mode: prioritize urgent tasks first.";
  }

  const nextAction = smart.nextTask
    ? `Start with: ${smart.nextTask.title}. ${smart.nextTask.reason}`
    : "No urgent next action. You are caught up.";

  const todaysPlan =
    `Today's plan has ${countTodayTaskBlocks(schedule.timeline)} scheduled task blocks` +
    (schedule.unscheduledTaskIds.length > 0
      ? `, with ${schedule.unscheduledTaskIds.length} unscheduled task${schedule.unscheduledTaskIds.length === 1 ? "" : "s"}.`
      : ".");

  return {
    systemState,
    insights,
    focusTasks,
    suggestedWorkload: adaptive.workload,
    nextBestTask: smart.nextTask,
    schedule,
    recommendations: {
      systemRecommendation,
      nextAction,
      todaysPlan,
    },
  };
};

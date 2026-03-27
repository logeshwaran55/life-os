import type { Task } from "../types/column";
import { generateSmartEngine } from "./smartEngine";
import {
  analyzeUserBehavior,
  generateAdaptiveIntelligence,
  type UserBehavior,
} from "./adaptiveEngine";
import { getSystemState, type SystemState } from "./systemState";
import { getOverdueTasks } from "./timeUtils";

export type NextActionResult = {
  nextBestTask: {
    id: string;
    title: string;
    reason: string;
    score: number;
    dueDate: string | null;
  } | null;
  recommendation: string;
};

/**
 * Produces the next recommended action using all intelligence layers.
 */
export const getNextAction = (
  tasks: Task[],
  state: SystemState,
  behavior: UserBehavior,
  dateColumnId = "dueDate"
): NextActionResult => {
  const smart = generateSmartEngine(tasks, dateColumnId);
  const adaptive = generateAdaptiveIntelligence(tasks, dateColumnId);
  const overdueTasks = getOverdueTasks(tasks, dateColumnId);

  if (state === "overload") {
    return {
      nextBestTask: smart.nextTask,
      recommendation:
        `Reduce workload today. Target ${adaptive.workload.recommendedMin}-${adaptive.workload.recommendedMax} tasks and avoid adding new ones.`,
    };
  }

  if (overdueTasks.length > 0) {
    return {
      nextBestTask: smart.nextTask,
      recommendation: "Focus on overdue tasks first, then move to today's highest-priority item.",
    };
  }

  if (behavior.completionRate < 40) {
    return {
      nextBestTask: smart.nextTask,
      recommendation: "Simplify plan: complete one high-impact task before opening new work.",
    };
  }

  return {
    nextBestTask: smart.nextTask,
    recommendation: smart.nextTask
      ? `Start ${smart.nextTask.title} now.`
      : "You are caught up. Review upcoming tasks and plan tomorrow.",
  };
};

/**
 * Convenience helper for callers that don't already have behavior/state.
 */
export const getSystemDecision = (
  tasks: Task[],
  dateColumnId = "dueDate"
): { state: SystemState; behavior: UserBehavior; action: NextActionResult } => {
  const behavior = analyzeUserBehavior(tasks);
  const state = getSystemState(tasks, behavior, dateColumnId);
  const action = getNextAction(tasks, state, behavior, dateColumnId);

  return {
    state,
    behavior,
    action,
  };
};

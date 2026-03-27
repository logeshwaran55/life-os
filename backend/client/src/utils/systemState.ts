import type { Task } from "../types/column";
import type { UserBehavior } from "./adaptiveEngine";
import { getOverdueTasks } from "./timeUtils";

export type SystemState = "focus" | "overload" | "balanced";

/**
 * Determine high-level system mode from task pressure and user behavior.
 */
export const getSystemState = (
  tasks: Task[],
  behavior: UserBehavior,
  dateColumnId = "dueDate"
): SystemState => {
  const pendingCount = tasks.filter((task) => !task.completed).length;
  const overdueCount = getOverdueTasks(tasks, dateColumnId).length;

  const isOverload = pendingCount > 10 && behavior.completionRate < 45;
  if (isOverload) {
    return "overload";
  }

  const isFocus = overdueCount > 0 || (pendingCount > 0 && pendingCount <= 5);
  if (isFocus) {
    return "focus";
  }

  return "balanced";
};

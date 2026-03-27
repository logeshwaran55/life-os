import type { Task } from "../types/column";

const DAY_MS = 24 * 60 * 60 * 1000;

const toLocalDay = (date: Date): Date =>
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

  return toLocalDay(parsed);
};

const daysDiff = (from: Date, to: Date): number => {
  const lhs = toLocalDay(from).getTime();
  const rhs = toLocalDay(to).getTime();
  return Math.round((lhs - rhs) / DAY_MS);
};

export const getTaskDueDate = (task: Task, dateColumnId = "dueDate"): Date | null => {
  return parseTaskDate(task.values[dateColumnId]);
};

export const getTodayTasks = (tasks: Task[], dateColumnId = "dueDate", now = new Date()): Task[] => {
  return tasks.filter((task) => {
    const due = getTaskDueDate(task, dateColumnId);
    return due !== null && daysDiff(due, now) === 0;
  });
};

export const getOverdueTasks = (tasks: Task[], dateColumnId = "dueDate", now = new Date()): Task[] => {
  return tasks.filter((task) => {
    if (task.completed) {
      return false;
    }
    const due = getTaskDueDate(task, dateColumnId);
    return due !== null && daysDiff(due, now) < 0;
  });
};

export const getUpcomingTasks = (tasks: Task[], dateColumnId = "dueDate", now = new Date()): Task[] => {
  return tasks.filter((task) => {
    const due = getTaskDueDate(task, dateColumnId);
    if (!due) {
      return false;
    }

    const diff = daysDiff(due, now);
    return diff > 0 && diff <= 7;
  });
};

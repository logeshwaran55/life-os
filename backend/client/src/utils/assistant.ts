import type { Column, Task } from "../types/column";
import { getDefaultValueForColumn } from "../types/column";
import type { TrackingMetrics } from "./metrics";
import { generateSmartEngine } from "./smartEngine";
import type { AdaptiveScheduleResult } from "./adaptiveScheduleEngine";
import { generateAdaptiveSchedule } from "./adaptiveScheduleEngine";

export type AssistantViewMode =
  | "dashboard"
  | "list"
  | "table"
  | "schedule"
  | "calendar"
  | "smart"
  | "assistant";

export type AssistantContext = {
  tasks: Task[];
  columns: Column[];
  metrics: TrackingMetrics;
  schedule: AdaptiveScheduleResult;
  dateColumnId: string;
};

export type AssistantCommandChanges = {
  tasks?: Task[];
  viewMode?: AssistantViewMode;
  showSuggestions?: boolean;
};

export type AssistantCommandResult = {
  message: string;
  changes: AssistantCommandChanges;
};

const normalizePriority = (raw: unknown): "high" | "medium" | "low" => {
  if (typeof raw !== "string") return "medium";
  const normalized = raw.trim().toLowerCase();
  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }

  return "medium";
};

const getTaskTitle = (task: Task): string => {
  const raw = task.values.name;
  return typeof raw === "string" && raw.trim() ? raw : "Untitled task";
};

const createTaskFromText = (text: string, columns: Column[]): Task => {
  const values: Task["values"] = {};

  columns.forEach((column) => {
    values[column.id] = getDefaultValueForColumn(column.type);
  });

  values.name = text;

  if ("priority" in values) {
    values.priority = "medium";
  }

  if ("duration" in values) {
    values.duration = 60;
  }

  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    values,
    createdAt: new Date().toISOString(),
    completed: false,
    completedAt: null,
  };
};

const summarizeProgress = (metrics: TrackingMetrics): string => {
  const completion = metrics.core.completionPercentage;
  const completed = metrics.core.completedTasks;
  const total = metrics.core.totalTasks;
  const overdue = metrics.time.overdueTasks;
  const dueToday = metrics.time.dueToday;

  const overdueText = overdue > 0 ? `${overdue} overdue` : "no overdue";
  const dueTodayText = dueToday > 0 ? `${dueToday} due today` : "nothing due today";

  return `You have completed ${completed}/${total} tasks (${completion}%). Right now: ${overdueText}, ${dueTodayText}.`;
};

const summarizeSchedule = (
  schedule: AdaptiveScheduleResult,
  tasks: Task[]
): string => {
  const firstTaskBlock = schedule.timeline.find(
    (entry) => entry.kind === "task" && entry.dayOffset === 0 && entry.taskId
  );

  if (!firstTaskBlock || !firstTaskBlock.taskId) {
    return "I reviewed your plan, but there are no pending tasks to schedule right now.";
  }

  const nextTask = tasks.find((task) => task.id === firstTaskBlock.taskId);
  const nextTaskName = nextTask ? getTaskTitle(nextTask) : "your next task";

  const movedText =
    schedule.pushedToNextDayTaskIds.length > 0
      ? ` ${schedule.pushedToNextDayTaskIds.length} task${schedule.pushedToNextDayTaskIds.length === 1 ? " was" : "s were"} moved to tomorrow.`
      : "";

  const unscheduledText =
    schedule.unscheduledTaskIds.length > 0
      ? ` ${schedule.unscheduledTaskIds.length} task${schedule.unscheduledTaskIds.length === 1 ? " is" : "s are"} still unscheduled.`
      : "";

  return `I created your adaptive schedule. Start with ${nextTaskName} at ${firstTaskBlock.start}.${movedText}${unscheduledText}`.trim();
};

/**
 * Central assistant command handler.
 *
 * Parsing strategy:
 * 1) Normalize input to lowercase.
 * 2) Match known command phrases.
 * 3) Execute app actions and return both message + state changes.
 */
export const handleUserCommand = (
  input: string,
  context: AssistantContext
): AssistantCommandResult => {
  const trimmed = input.trim();
  const normalized = trimmed.toLowerCase();

  if (!trimmed) {
    return {
      message: "Please type a command like: plan my day, what should I do, show progress, reschedule tasks, or add task Write report.",
      changes: {},
    };
  }

  if (normalized.startsWith("add task")) {
    const taskText = trimmed.slice(8).trim();
    if (!taskText) {
      return {
        message: "Please include task text after add task, for example: add task Review sprint board.",
        changes: {},
      };
    }

    const newTask = createTaskFromText(taskText, context.columns);
    const nextTasks = [...context.tasks, newTask];

    return {
      message: `Added task: ${taskText}. I also set it to medium priority and 60 minutes by default.`,
      changes: {
        tasks: nextTasks,
        viewMode: "table",
      },
    };
  }

  if (normalized.includes("plan my day")) {
    return {
      message: summarizeSchedule(context.schedule, context.tasks),
      changes: {
        viewMode: "schedule",
      },
    };
  }

  if (normalized.includes("reschedule tasks")) {
    const schedule = generateAdaptiveSchedule(context.tasks, context.dateColumnId);
    return {
      message: `I re-ran scheduling. ${summarizeSchedule(schedule, context.tasks)}`,
      changes: {
        viewMode: "schedule",
      },
    };
  }

  if (normalized.includes("what should i do")) {
    const smart = generateSmartEngine(context.tasks, context.dateColumnId);

    if (smart.nextTask) {
      return {
        message: `Next best task is ${smart.nextTask.title}. Reason: ${smart.nextTask.reason}`,
        changes: {
          viewMode: "smart",
          showSuggestions: true,
        },
      };
    }

    return {
      message: "You are all caught up. No pending task needs immediate action.",
      changes: {
        viewMode: "smart",
        showSuggestions: true,
      },
    };
  }

  if (normalized.includes("show progress")) {
    return {
      message: summarizeProgress(context.metrics),
      changes: {
        viewMode: "table",
      },
    };
  }

  const highPriorityPending = context.tasks.filter(
    (task) => !task.completed && normalizePriority(task.values.priority) === "high"
  ).length;

  return {
    message:
      `I did not recognize that command yet. Try one of: plan my day, what should I do, show progress, reschedule tasks, add task [text].` +
      (highPriorityPending > 0
        ? ` You currently have ${highPriorityPending} high-priority pending task${highPriorityPending === 1 ? "" : "s"}.`
        : ""),
    changes: {},
  };
};

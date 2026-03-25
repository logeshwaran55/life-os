import { calculateTaskScore } from "./taskScoring";

type Task = {
  id: string;
  text: string;
  completed: boolean;
  dueDate: string;
  priority: "low" | "medium" | "high";
};

export type TimeSlot = {
  hour: number;
  label: string;
};

export type ScheduledTask = {
  task: Task;
  slotHour: number;
  score: number;
};

export const DAILY_START_HOUR = 6;
export const DAILY_END_HOUR = 22;

export const generateDailySlots = (
  startHour: number = DAILY_START_HOUR,
  endHour: number = DAILY_END_HOUR
): TimeSlot[] => {
  const slots: TimeSlot[] = [];

  for (let hour = startHour; hour < endHour; hour += 1) {
    const isPM = hour >= 12;
    const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
    slots.push({
      hour,
      label: `${twelveHour}:00 ${isPM ? "PM" : "AM"}`,
    });
  }

  return slots;
};

const isTaskOnDate = (task: Task, selectedDate: string): boolean => {
  if (!task.dueDate) return false;
  return task.dueDate === selectedDate;
};

export const getTasksForDay = (tasks: Task[], selectedDate: string): Task[] => {
  return tasks.filter((task) => !task.completed && isTaskOnDate(task, selectedDate));
};

export const scheduleTasksForDay = (
  tasks: Task[],
  selectedDate: string,
  startHour: number = DAILY_START_HOUR,
  endHour: number = DAILY_END_HOUR
): { scheduled: ScheduledTask[]; overflow: Task[] } => {
  const dayTasks = getTasksForDay(tasks, selectedDate);

  const scoredTasks = [...dayTasks]
    .map((task) => ({ task, score: calculateTaskScore(task) }))
    .sort((a, b) => b.score - a.score);

  const slots = generateDailySlots(startHour, endHour);
  const scheduled: ScheduledTask[] = [];

  for (let index = 0; index < scoredTasks.length && index < slots.length; index += 1) {
    scheduled.push({
      task: scoredTasks[index].task,
      score: scoredTasks[index].score,
      slotHour: slots[index].hour,
    });
  }

  const overflow =
    scoredTasks.length > slots.length
      ? scoredTasks.slice(slots.length).map((item) => item.task)
      : [];

  return { scheduled, overflow };
};

export const getPriorityColor = (priority: Task["priority"]): string => {
  if (priority === "high") return "#ff4444";
  if (priority === "medium") return "#ff9800";
  return "#4caf50";
};

export type TaskEventType =
  | "task_created"
  | "task_updated"
  | "task_completed"
  | "task_deleted";

export type TaskEvent = {
  id: string;
  type: TaskEventType;
  taskId: string;
  timestamp: string;
};

const EVENTS_STORAGE_KEY = "lifeos-task-events";

const readEvents = (): TaskEvent[] => {
  try {
    const raw = window.localStorage.getItem(EVENTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as TaskEvent[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
};

const writeEvents = (events: TaskEvent[]): void => {
  window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
};

/**
 * Creates and stores an event in browser storage.
 * This can be replaced with backend persistence later.
 */
export const createEvent = (
  type: TaskEventType,
  taskId: string,
  timestamp: string = new Date().toISOString()
): TaskEvent => {
  const nextEvent: TaskEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    taskId,
    timestamp,
  };

  const events = readEvents();
  events.push(nextEvent);
  writeEvents(events);

  return nextEvent;
};

/**
 * Returns all events for a specific task sorted newest first.
 */
export const getTaskHistory = (taskId: string): TaskEvent[] => {
  return readEvents()
    .filter((event) => event.taskId === taskId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
};

export const getAllEvents = (): TaskEvent[] => {
  return readEvents().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
};

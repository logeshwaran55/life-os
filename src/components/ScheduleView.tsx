import { useMemo, useState } from "react";
import type { Task } from "../types/column";
import { generateAdaptiveSchedule } from "../utils/adaptiveScheduleEngine";

type Props = {
  tasks: Task[];
  dateColumnId: string;
  onTaskClick?: (taskId: string) => void;
  onReorderTask?: (sourceTaskId: string, targetTaskId: string) => void;
};

const getTaskTitle = (task: Task): string => {
  const raw = task.values.name;
  return typeof raw === "string" && raw.trim() ? raw : "Untitled task";
};

const getTaskMeta = (task: Task): string => {
  const dueDate = typeof task.values.dueDate === "string" ? task.values.dueDate : "";
  const priorityRaw = typeof task.values.priority === "string" ? task.values.priority : "medium";
  return `${priorityRaw} priority${dueDate ? ` · due ${dueDate}` : ""}`;
};

const getDayLabel = (dayOffset: number): string => {
  if (dayOffset === 0) return "Today";
  if (dayOffset === 1) return "Tomorrow";
  return `Day +${dayOffset}`;
};

const getTaskPriority = (task: Task): "high" | "medium" | "low" => {
  const raw = task.values.priority;
  const normalized = typeof raw === "string" ? raw.trim().toLowerCase() : "medium";
  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }

  return "medium";
};

export default function ScheduleView({
  tasks,
  dateColumnId,
  onTaskClick,
  onReorderTask,
}: Props) {
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [wasDragging, setWasDragging] = useState(false);

  const schedule = useMemo(
    () => generateAdaptiveSchedule(tasks, dateColumnId),
    [tasks, dateColumnId]
  );

  const groupedTimeline = useMemo(() => {
    const groups = new Map<number, typeof schedule.timeline>();
    schedule.timeline.forEach((entry) => {
      const existing = groups.get(entry.dayOffset) ?? [];
      existing.push(entry);
      groups.set(entry.dayOffset, existing);
    });

    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  }, [schedule.timeline]);

  const taskById = useMemo(() => {
    const map = new Map<string, Task>();
    tasks.forEach((task) => map.set(task.id, task));
    return map;
  }, [tasks]);

  if (schedule.timeline.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🗓️</div>
        <p>
          <strong>No pending tasks to schedule</strong>
        </p>
        <p>Add tasks or mark existing tasks as pending to generate a daily plan.</p>
      </div>
    );
  }

  return (
    <div className="schedule-shell">
      <div className="schedule-header">
        <h3 className="schedule-title">Today&apos;s Schedule</h3>
        {schedule.pushedToNextDayTaskIds.length > 0 && (
          <p className="schedule-note">
            {schedule.pushedToNextDayTaskIds.length} task
            {schedule.pushedToNextDayTaskIds.length === 1 ? "" : "s"} moved to the next day.
          </p>
        )}
        {schedule.unscheduledTaskIds.length > 0 && (
          <p className="schedule-note">
            {schedule.unscheduledTaskIds.length} task
            {schedule.unscheduledTaskIds.length === 1 ? "" : "s"} could not be placed yet.
          </p>
        )}
      </div>

      <div
        className="schedule-list"
        onPointerUp={() => {
          setDragTaskId(null);
          setDragOverTaskId(null);
        }}
      >
        {groupedTimeline.map(([dayOffset, entries]) => (
          <div key={dayOffset} className="schedule-day">
            <div className="schedule-day-label">
              {getDayLabel(dayOffset)}
            </div>

            {entries.map((entry) => {
              if (entry.kind === "break") {
                return (
                  <div key={`${dayOffset}-${entry.start}-break`} className="schedule-row break-row">
                    <div className="schedule-time">
                      {entry.start} - {entry.end}
                    </div>
                    <div className="schedule-break-card">
                      Break ({entry.durationMinutes} min)
                    </div>
                  </div>
                );
              }

              if (!entry.taskId) return null;
              const task = taskById.get(entry.taskId);
              if (!task) return null;

              const priority = entry.priority ?? getTaskPriority(task);

              return (
                <div key={`${dayOffset}-${entry.start}-${entry.taskId}`} className="schedule-row">
                  <div className="schedule-time">
                    {entry.start} - {entry.end}
                  </div>
                  <button
                    type="button"
                    className={[
                      `schedule-task ${priority}-priority`,
                      dragTaskId === task.id ? "dragging" : "",
                      dragOverTaskId === task.id ? "drag-over" : "",
                    ].join(" ")}
                    onClick={() => {
                      if (wasDragging) {
                        setWasDragging(false);
                        return;
                      }
                      onTaskClick?.(task.id);
                    }}
                    onPointerDown={() => {
                      if (dayOffset !== 0 || !onReorderTask) return;
                      setDragTaskId(task.id);
                      setDragOverTaskId(task.id);
                    }}
                    onPointerEnter={() => {
                      if (!dragTaskId || dayOffset !== 0 || !onReorderTask) return;
                      setDragOverTaskId(task.id);
                    }}
                    onPointerUp={() => {
                      if (!dragTaskId || !dragOverTaskId || !onReorderTask) return;
                      if (dragTaskId !== dragOverTaskId) {
                        onReorderTask(dragTaskId, dragOverTaskId);
                        setWasDragging(true);
                      }
                      setDragTaskId(null);
                      setDragOverTaskId(null);
                    }}
                    onPointerCancel={() => {
                      setDragTaskId(null);
                      setDragOverTaskId(null);
                    }}
                  >
                    <div className="schedule-task-title-row">
                      <div className="schedule-task-title">{getTaskTitle(task)}</div>
                      {dayOffset === 0 && onReorderTask && (
                        <div className="schedule-actions-hint">
                          Drag to reorder
                        </div>
                      )}
                    </div>
                    <div className="schedule-task-meta">
                      {getTaskMeta(task)} · {entry.durationMinutes} min · score {entry.score ?? "-"}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

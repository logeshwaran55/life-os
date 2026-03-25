import { useMemo, useState } from "react";
import {
  DAILY_END_HOUR,
  DAILY_START_HOUR,
  generateDailySlots,
  getPriorityColor,
  scheduleTasksForDay,
} from "../utils/scheduler";

type Task = {
  id: string;
  text: string;
  completed: boolean;
  dueDate: string;
  priority: "low" | "medium" | "high";
};

type Props = {
  tasks: Task[];
};

const getTodayISODate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function CalendarView({ tasks }: Props) {
  const [selectedDate, setSelectedDate] = useState(getTodayISODate());

  const slots = useMemo(() => generateDailySlots(DAILY_START_HOUR, DAILY_END_HOUR), []);

  const { scheduled, overflow } = useMemo(() => {
    return scheduleTasksForDay(tasks, selectedDate, DAILY_START_HOUR, DAILY_END_HOUR);
  }, [tasks, selectedDate]);

  const scheduledByHour = useMemo(() => {
    const map = new Map<number, (typeof scheduled)[number]>();
    for (const item of scheduled) {
      map.set(item.slotHour, item);
    }
    return map;
  }, [scheduled]);

  return (
    <div>
      <div className="page-header" style={{ marginBottom: "12px" }}>
        <div>
          <h3 style={{ margin: 0 }}>📅 Daily Calendar</h3>
          <p className="subtitle" style={{ fontSize: "12px" }}>
            Tasks are auto-scheduled by priority and urgency (higher score gets earlier time).
          </p>
        </div>

        <div className="controls-row" style={{ marginTop: 0 }}>
          <label htmlFor="calendar-date" className="controls-label">
            Date:
          </label>
          <input
            id="calendar-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        </div>
      </div>

      <div className="calendar-shell">
        {slots.map((slot) => {
          const block = scheduledByHour.get(slot.hour);

          return (
            <div key={slot.hour} className="calendar-row">
              <div className="calendar-time">
                {slot.label}
              </div>

              <div className="calendar-slot">
                {block ? (
                  <div
                    className="calendar-task"
                    style={{ borderLeftColor: getPriorityColor(block.task.priority) }}
                  >
                    <div style={{ fontWeight: "bold", fontSize: "13px" }}>{block.task.text}</div>
                    <div className="summary-text" style={{ marginTop: "4px" }}>
                      Priority: {block.task.priority.toUpperCase()} · Score: {Math.round(block.score)}
                    </div>
                  </div>
                ) : (
                  <div className="summary-text">Free slot</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {overflow.length > 0 && (
        <div className="card section-card" style={{ marginTop: "12px" }}>
          <strong>Overflow:</strong> {overflow.length} task(s) could not fit into {DAILY_END_HOUR - DAILY_START_HOUR} slots.
        </div>
      )}
    </div>
  );
}

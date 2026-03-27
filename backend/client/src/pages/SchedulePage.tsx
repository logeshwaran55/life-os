import { useMemo, useState } from "react";
import type { Schedule } from "../types/schedule";
import { getTodayDate, isScheduleOnDate } from "../utils/scheduleSystem";

type Props = {
  schedules: Schedule[];
  onCreateSchedule: (schedule: Omit<Schedule, "id">) => Promise<void>;
  onUpdateSchedule: (scheduleId: string, updates: Partial<Omit<Schedule, "id">>) => Promise<void>;
  onDeleteSchedule: (scheduleId: string) => Promise<void>;
};

type DraftState = {
  mode: "create" | "edit";
  scheduleId: string | null;
  title: string;
  startTime: string;
  endTime: string;
};

const CALENDAR_START_HOUR = 6;
const CALENDAR_END_HOUR = 22;
const HOUR_HEIGHT_PX = 64;

const pad = (value: number): string => String(value).padStart(2, "0");

const hourToTimeString = (hour: number): string => `${pad(hour)}:00`;

const formatHourLabel = (hour: number): string => {
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:00 ${suffix}`;
};

const timeToMinutes = (time: string): number => {
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return 0;
  }

  return hour * 60 + minute;
};

const isValidTimeRange = (startTime: string, endTime: string): boolean => {
  return timeToMinutes(endTime) > timeToMinutes(startTime);
};

const toDisplayRange = (startTime: string, endTime: string): string => {
  return `${startTime} - ${endTime}`;
};

const createDraftAtHour = (hour: number): DraftState => {
  const clampedHour = Math.min(Math.max(hour, CALENDAR_START_HOUR), CALENDAR_END_HOUR - 1);
  return {
    mode: "create",
    scheduleId: null,
    title: "",
    startTime: hourToTimeString(clampedHour),
    endTime: hourToTimeString(Math.min(clampedHour + 1, CALENDAR_END_HOUR)),
  };
};

export default function SchedulePage({
  schedules,
  onCreateSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [feedback, setFeedback] = useState<string>("");
  const [draft, setDraft] = useState<DraftState>(() => createDraftAtHour(8));
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);

  const hours = useMemo(() => {
    const next: number[] = [];
    for (let hour = CALENDAR_START_HOUR; hour < CALENDAR_END_HOUR; hour += 1) {
      next.push(hour);
    }
    return next;
  }, []);

  const schedulesForDate = useMemo(() => {
    return schedules
      .filter((schedule) => isScheduleOnDate(schedule, selectedDate))
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [schedules, selectedDate]);

  const completedCount = useMemo(() => {
    return schedulesForDate.filter((schedule) => schedule.completed).length;
  }, [schedulesForDate]);

  const totalTimelineHeight = hours.length * HOUR_HEIGHT_PX;
  const dayStartMinutes = CALENDAR_START_HOUR * 60;
  const dayEndMinutes = CALENDAR_END_HOUR * 60;

  const openCreateDraft = (hour: number) => {
    setDraft(createDraftAtHour(hour));
    setFeedback("");
  };

  const openEditDraft = (schedule: Schedule) => {
    setDraft({
      mode: "edit",
      scheduleId: schedule.id,
      title: schedule.title,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    });
    setFeedback("");
  };

  const closeDraft = () => {
    setDraft(createDraftAtHour(8));
  };

  const saveDraft = async () => {
    const title = draft.title.trim();
    if (!title) {
      setFeedback("Add a title so this time block is easy to find later.");
      return;
    }

    if (!isValidTimeRange(draft.startTime, draft.endTime)) {
      setFeedback("Set an end time that comes after the start time.");
      return;
    }

    setIsSubmittingDraft(true);

    try {
      if (draft.mode === "create") {
        await onCreateSchedule({
          title,
          date: selectedDate,
          startTime: draft.startTime,
          endTime: draft.endTime,
          completed: false,
        });
        setFeedback("Great. Your schedule entry is on the calendar.");
        setDraft(createDraftAtHour(Number(draft.startTime.split(":")[0]) || 8));
        return;
      }

      if (!draft.scheduleId) {
        return;
      }

      await onUpdateSchedule(draft.scheduleId, {
        title,
        date: selectedDate,
        startTime: draft.startTime,
        endTime: draft.endTime,
      });
      setFeedback("Nice update. Your schedule is saved.");
      setDraft(createDraftAtHour(Number(draft.startTime.split(":")[0]) || 8));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmittingDraft(false);
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    setPendingDeleteId(scheduleId);
    try {
      await onDeleteSchedule(scheduleId);
      setFeedback("Removed from your calendar.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setPendingDeleteId(null);
    }
  };

  const toggleScheduleComplete = async (schedule: Schedule) => {
    setPendingToggleId(schedule.id);
    try {
      await onUpdateSchedule(schedule.id, { completed: !schedule.completed });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setPendingToggleId(null);
    }
  };

  return (
    <div className="view-frame schedule-mode schedule-page">
      <section className="card section-card schedule-hero">
        <h2 className="dashboard-section-title">Unified Schedule</h2>
        <p className="dashboard-section-subtitle">
          Plan your day with clarity. Click any hour to quickly create a schedule entry.
        </p>
        <div className="action-meta-row">
          <span className="action-meta-chip">Entries: {schedulesForDate.length}</span>
          <span className="action-meta-chip">Completed: {completedCount}</span>
          <span className="action-meta-chip">Window: 6:00 AM - 10:00 PM</span>
        </div>
        <div className="schedule-controls-grid" aria-label="Schedule controls">
          <label className="schedule-control">
            <span>Date</span>
            <input
              className="input"
              type="date"
              value={selectedDate}
              onChange={(event) => {
                setSelectedDate(event.target.value);
                setDraft(createDraftAtHour(8));
              }}
            />
          </label>
        </div>
      </section>

      <section className="card section-card schedule-editor-card">
        <div className="progress-section-header">
          <h3 className="dashboard-section-title">
            {draft.mode === "create" ? "Create schedule entry" : "Edit schedule entry"}
          </h3>
          <p className="dashboard-section-subtitle">Give it a clear title, set the time, and you are good to go.</p>
        </div>
        <div className="schedule-editor-grid">
          <label className="schedule-control">
            <span>Title</span>
            <input
              className="input"
              type="text"
              placeholder="Focus block, client call, workout..."
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            />
          </label>
          <label className="schedule-control">
            <span>Start time</span>
            <input
              className="input"
              type="time"
              value={draft.startTime}
              onChange={(event) => setDraft((prev) => ({ ...prev, startTime: event.target.value }))}
            />
          </label>
          <label className="schedule-control">
            <span>End time</span>
            <input
              className="input"
              type="time"
              value={draft.endTime}
              onChange={(event) => setDraft((prev) => ({ ...prev, endTime: event.target.value }))}
            />
          </label>
        </div>
        <div className="schedule-edit-actions">
          <button type="button" className="btn btn-primary" onClick={() => void saveDraft()} disabled={isSubmittingDraft}>
            {isSubmittingDraft
              ? "Saving..."
              : draft.mode === "create"
                ? "Create & Schedule"
                : "Save Changes"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={closeDraft} disabled={isSubmittingDraft}>
            Cancel
          </button>
        </div>
      </section>

      <section className="card section-card unified-schedule-layout">
        <div className="unified-time-grid" style={{ ["--timeline-height" as string]: `${totalTimelineHeight}px` }}>
          <div className="time-rail" aria-label="Time labels">
            {hours.map((hour) => (
              <div key={hour} className="time-label" style={{ height: `${HOUR_HEIGHT_PX}px` }}>
                {formatHourLabel(hour)}
              </div>
            ))}
          </div>

          <div className="day-rail" aria-label="Day timeline">
            {hours.map((hour) => (
              <button
                key={hour}
                type="button"
                className="time-slot-button"
                style={{ height: `${HOUR_HEIGHT_PX}px` }}
                onClick={() => openCreateDraft(hour)}
              >
                <span>Create at {formatHourLabel(hour)}</span>
              </button>
            ))}

            <div className="event-layer">
              {schedulesForDate.map((schedule) => {
                const startMinutes = Math.max(dayStartMinutes, timeToMinutes(schedule.startTime));
                const endMinutes = Math.min(dayEndMinutes, timeToMinutes(schedule.endTime));
                const duration = Math.max(30, endMinutes - startMinutes);
                const top = ((startMinutes - dayStartMinutes) / 60) * HOUR_HEIGHT_PX;
                const height = (duration / 60) * HOUR_HEIGHT_PX;

                return (
                  <article
                    key={schedule.id}
                    className={`calendar-event ${schedule.completed ? "completed" : ""}`}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      background: "hsl(210 85% 94%)",
                      borderColor: "hsl(210 70% 48%)",
                    }}
                  >
                    <div className="calendar-event-head">
                      <label className="schedule-complete-toggle">
                        <input
                          type="checkbox"
                          checked={schedule.completed}
                          onChange={() => void toggleScheduleComplete(schedule)}
                          disabled={pendingToggleId === schedule.id}
                        />
                        <span>{schedule.title}</span>
                      </label>
                      <div className="schedule-inline-actions">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => openEditDraft(schedule)}
                          disabled={pendingDeleteId === schedule.id || pendingToggleId === schedule.id}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => void deleteSchedule(schedule.id)}
                          disabled={pendingDeleteId === schedule.id}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <span className="schedule-task-meta-line">{toDisplayRange(schedule.startTime, schedule.endTime)}</span>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {feedback ? <p className="schedule-drop-feedback">{feedback}</p> : null}
    </div>
  );
}

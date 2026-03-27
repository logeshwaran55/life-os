import { useMemo, useState } from "react";
import type { Task } from "../types/column";
import {
  buildDailyActivity,
  buildChartSeries,
  buildSummaryMetrics,
  getCompletedTasksForDay,
  getFilteredTasks,
  getFilterRange,
  getHeatIntensityLevel,
  getTaskTitle,
  type ProgressFilter,
} from "../utils/progressAnalytics";

type Props = {
  tasks: Task[];
};

const FILTER_OPTIONS: Array<{ value: ProgressFilter; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export default function ProgressPage({ tasks }: Props) {
  const [filter, setFilter] = useState<ProgressFilter>("weekly");
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const range = useMemo(() => getFilterRange(filter), [filter]);
  const filteredTasks = useMemo(() => getFilteredTasks(tasks, filter), [tasks, filter]);

  const summary = useMemo(() => buildSummaryMetrics(filteredTasks), [filteredTasks]);
  const dailyActivity = useMemo(() => buildDailyActivity(filteredTasks, range), [filteredTasks, range]);
  const chartSeries = useMemo(() => buildChartSeries(filteredTasks, filter, range), [filteredTasks, filter, range]);

  const completedToday = useMemo(() => filteredTasks.filter((task) => task.completed), [filteredTasks]);
  const pendingToday = useMemo(() => filteredTasks.filter((task) => !task.completed), [filteredTasks]);
  const selectedDayTasks = useMemo(() => {
    if (!selectedDayKey) {
      return [];
    }
    return getCompletedTasksForDay(filteredTasks, selectedDayKey);
  }, [filteredTasks, selectedDayKey]);

  const selectedDayLabel = useMemo(() => {
    if (!selectedDayKey) {
      return "";
    }

    const match = dailyActivity.find((point) => point.dateKey === selectedDayKey);
    return match?.label ?? selectedDayKey;
  }, [dailyActivity, selectedDayKey]);

  const isDaily = filter === "daily";
  const filterLabel = `${filter.charAt(0).toUpperCase()}${filter.slice(1)}`;
  const chartTitle = filter === "weekly" ? "Completed in Last 7 Days" : filter === "monthly" ? "Completed by Day (This Month)" : "Completed by Month (This Year)";
  const chartSubtitle = filter === "weekly" ? "Seven-day completion bars driven by your weekly filter." : filter === "monthly" ? "Daily completion bars for the current month." : "Monthly completion summary for the current year.";

  const maxDailyCount = useMemo(() => {
    return dailyActivity.reduce((max, point) => Math.max(max, point.count), 0);
  }, [dailyActivity]);

  const maxChartCount = useMemo(() => {
    return chartSeries.reduce((max, point) => Math.max(max, point.count), 0);
  }, [chartSeries]);

  return (
    <div className="view-frame progress-page">
      <section className="card section-card progress-hero" aria-label="Progress controls">
        <div>
          <h2 className="dashboard-section-title">Progress Analytics</h2>
          <p className="dashboard-section-subtitle">
            Understand your productivity trends with daily activity, streaks, and completion history.
          </p>
        </div>
        <label className="progress-filter">
          <span className="progress-filter-label">View</span>
          <select
            className="select"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value as ProgressFilter);
              setSelectedDayKey(null);
            }}
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="card section-card progress-state-pill" aria-label="Current filter status">
        <p>
          Showing: <strong>{filterLabel} data</strong>
        </p>
      </section>

      <section className="progress-metric-grid" aria-label="Summary metrics">
        <article className="card section-card progress-metric-card">
          <p className="summary-label">Total Completed</p>
          <h3 className="summary-value">{summary.totalCompleted}</h3>
          <p className="summary-meta">Tasks completed in this {filterLabel.toLowerCase()} period.</p>
        </article>
        <article className="card section-card progress-metric-card">
          <p className="summary-label">Current Streak</p>
          <h3 className="summary-value">{summary.currentStreak}d</h3>
          <p className="summary-meta">Consecutive days with at least one completed task.</p>
        </article>
        <article className="card section-card progress-metric-card">
          <p className="summary-label">Best Streak</p>
          <h3 className="summary-value">{summary.bestStreak}d</h3>
          <p className="summary-meta">Your longest consistency run so far.</p>
        </article>
        <article className="card section-card progress-metric-card">
          <p className="summary-label">Completion Rate</p>
          <h3 className="summary-value">{summary.completionRate}%</h3>
          <p className="summary-meta">Ratio of completed tasks to all tasks.</p>
        </article>
      </section>

      {isDaily ? (
        <section className="progress-daily-grid" aria-label="Daily task view">
          <article className="card section-card progress-daily-card">
            <h3 className="dashboard-section-title">Completed Today</h3>
            <ul className="progress-task-list">
              {completedToday.length === 0 ? (
                <li className="progress-task-empty">No tasks completed today yet.</li>
              ) : (
                completedToday.map((task) => <li key={task.id}>{getTaskTitle(task)}</li>)
              )}
            </ul>
          </article>

          <article className="card section-card progress-daily-card">
            <h3 className="dashboard-section-title">Pending Today</h3>
            <ul className="progress-task-list">
              {pendingToday.length === 0 ? (
                <li className="progress-task-empty">No pending tasks for today.</li>
              ) : (
                pendingToday.map((task) => <li key={task.id}>{getTaskTitle(task)}</li>)
              )}
            </ul>
          </article>
        </section>
      ) : (
        <>
          <section className="card section-card progress-heatmap" aria-label="Activity heatmap">
            <div className="progress-section-header">
              <h3 className="dashboard-section-title">Activity Heatmap</h3>
              <p className="dashboard-section-subtitle">Each square represents one day in the selected filter range.</p>
            </div>

            <div className="heatmap-grid">
              {dailyActivity.map((point) => {
                const level = getHeatIntensityLevel(point.count, maxDailyCount);
                const isSelected = selectedDayKey === point.dateKey;
                return (
                  <button
                    key={point.dateKey}
                    type="button"
                    className="heatmap-cell-wrap heatmap-button"
                    onClick={() => setSelectedDayKey(point.dateKey)}
                    title={`${point.label}: ${point.count} task${point.count === 1 ? "" : "s"} completed`}
                  >
                    <span className={`heatmap-cell level-${level} ${isSelected ? "selected" : ""}`} />
                    <span className="heatmap-cell-label">{point.label}</span>
                  </button>
                );
              })}
            </div>

            {selectedDayKey ? (
              <div className="progress-day-detail">
                <div className="progress-day-detail-head">
                  <h4>Completed on {selectedDayLabel}</h4>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedDayKey(null)}>
                    Close
                  </button>
                </div>
                {selectedDayTasks.length === 0 ? (
                  <p className="dashboard-section-subtitle">No completed tasks on this day.</p>
                ) : (
                  <ul className="progress-task-list">
                    {selectedDayTasks.map((task) => (
                      <li key={task.id}>{getTaskTitle(task)}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </section>

          <section className="progress-chart-grid" aria-label="Progress charts">
            <article className="card section-card progress-chart-card">
              <div className="progress-section-header">
                <h3 className="dashboard-section-title">{chartTitle}</h3>
                <p className="dashboard-section-subtitle">{chartSubtitle}</p>
              </div>
              <div className="simple-bar-chart">
                {chartSeries.map((point) => {
                  const barHeight = maxChartCount > 0 ? Math.max(6, (point.count / maxChartCount) * 100) : 6;
                  return (
                    <div key={point.key} className="simple-bar-group" title={`${point.label}: ${point.count}`}>
                      <span className="simple-bar-value">{point.count}</span>
                      <div className="simple-bar-track">
                        <div className="simple-bar-fill" style={{ height: `${barHeight}%` }} />
                      </div>
                      <span className="simple-bar-label">{point.label}</span>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="card section-card progress-chart-card">
              <div className="progress-section-header">
                <h3 className="dashboard-section-title">Completion Split</h3>
                <p className="dashboard-section-subtitle">Completed vs pending tasks in the selected filter range.</p>
              </div>
              <div className="weekly-summary-list">
                <div className="weekly-summary-item">
                  <div className="weekly-summary-head">
                    <span>Completed</span>
                    <strong>{filteredTasks.filter((task) => task.completed).length}</strong>
                  </div>
                </div>
                <div className="weekly-summary-item">
                  <div className="weekly-summary-head">
                    <span>Pending</span>
                    <strong>{filteredTasks.filter((task) => !task.completed).length}</strong>
                  </div>
                </div>
                <div className="weekly-summary-item">
                  <div className="weekly-summary-head">
                    <span>Total in Range</span>
                    <strong>{filteredTasks.length}</strong>
                  </div>
                </div>
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}

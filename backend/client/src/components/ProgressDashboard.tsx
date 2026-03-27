import type { TrackingMetrics } from "../utils/metrics";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  metrics: TrackingMetrics;
};

export default function ProgressDashboard({ metrics }: Props) {
  const { core, time, behavior, insights } = metrics;
  const completionLine =
    core.totalTasks === 0
      ? "No tasks yet. Add your first one to start momentum."
      : `${core.completedTasks}/${core.totalTasks} tasks completed`;

  const completionPieData = [
    { name: "Completed", value: core.completedTasks, color: "#22c55e" },
    { name: "Pending", value: core.pendingTasks, color: "#ef4444" },
  ];

  const weeklyBarData = behavior.last7DaysTrend.map((point) => ({
    day: point.date,
    completed: point.count,
  }));

  return (
    <section className="card section-card progress-dashboard" aria-label="Progress dashboard">
      <div className="progress-header">
        <h2 className="progress-title">Your Momentum</h2>
        <p className="progress-subtitle">
          {completionLine}
        </p>
      </div>

      <div
        className="progress-bar-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={core.completionPercentage}
      >
        <div
          className="progress-bar-fill"
          style={{ width: `${core.completionPercentage}%` }}
        />
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Tasks</div>
          <div className="metric-value">{core.totalTasks}</div>
        </div>
        <div className="metric-card success">
          <div className="metric-label">Finished</div>
          <div className="metric-value">{core.completedTasks}</div>
        </div>
        <div className="metric-card warning">
          <div className="metric-label">Pending</div>
          <div className="metric-value">{core.pendingTasks}</div>
        </div>
        <div className="metric-card info">
          <div className="metric-label">Completed Today</div>
          <div className="metric-value">{time.completedToday}</div>
        </div>
        <div className="metric-card danger">
          <div className="metric-label">Overdue</div>
          <div className="metric-value">{time.overdueTasks}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Due Today</div>
          <div className="metric-value">{time.dueToday}</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">Completion Snapshot</div>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie
                data={completionPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
              >
                {completionPieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-title">Last 7 Days</div>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={weeklyBarData}>
              <XAxis dataKey="day" stroke="#6b7280" />
              <YAxis allowDecimals={false} stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="completed" radius={[6, 6, 0, 0]} fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="secondary-metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Current Streak</div>
          <div className="metric-value metric-value-small">{behavior.currentStreak} day{behavior.currentStreak === 1 ? "" : "s"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Longest Streak</div>
          <div className="metric-value metric-value-small">{behavior.longestStreak} day{behavior.longestStreak === 1 ? "" : "s"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Average Completion</div>
          <div className="metric-value metric-value-small">
            {behavior.averageCompletionHours === null
              ? "Not enough data yet"
              : `${behavior.averageCompletionHours}h`}
          </div>
        </div>
      </div>

      <ul className="insights-list">
        {insights.map((insight) => (
          <li key={insight} className="insight-item">
            {insight}
          </li>
        ))}
      </ul>
    </section>
  );
}

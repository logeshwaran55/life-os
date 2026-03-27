import type { RecommendedTask, SmartInsight } from "../utils/smartEngine";

type Props = {
  insights: SmartInsight[];
  nextTask: RecommendedTask | null;
  onTaskClick?: (taskId: string) => void;
};

/**
 * SuggestionPanel Component
 * 
 * Displays intelligent suggestions about user's tasks.
 * Helps users see patterns and make better decisions.
 * 
 * Features:
 * - Color-coded by severity (critical/warning/info/success)
 * - Shows affected task previews
 * - Responsive design
 * - Easy to scan
 */
export default function SuggestionPanel({
  insights,
  nextTask,
  onTaskClick,
}: Props) {
  // ==================== EMPTY STATE ====================
  if (insights.length === 0 && !nextTask) {
    return (
      <div className="suggestion-panel empty-state">
        <div className="empty-icon">✨</div>
        <p><strong>You are in a good place.</strong></p>
        <p>
          No immediate risks right now. Stay consistent and protect focus time.
        </p>
      </div>
    );
  }

  return (
    <aside className="suggestion-panel">
      <div className="suggestion-header">
        Smart Guidance ({insights.length})
      </div>

      {nextTask && (
        <div className="next-task-card">
          <div className="next-task-title">Best Next Move</div>
          <div
            className="next-task-name cell-clickable"
            onClick={() => onTaskClick?.(nextTask.id)}
            role="button"
            tabIndex={0}
          >
            {nextTask.title}
          </div>
          <div className="next-task-score">Priority score: {nextTask.score}</div>
          {nextTask.dueDate && <div className="next-task-meta">Due {nextTask.dueDate}</div>}
          <div className="next-task-meta">{nextTask.reason}</div>
        </div>
      )}

      <div className="suggestion-list">
        {insights.map((insight, index) => {
          return (
            <div
              key={insight.id}
              className={`suggestion-item ${insight.type}`}
              style={{
                borderBottom: index < insights.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <p className="suggestion-title">
                <span>{insight.message}</span>
              </p>

              {insight.detail && (
                <p className="suggestion-detail">
                  {insight.detail}
                </p>
              )}

              {insight.actionText && (
                <p className="suggestion-action">
                  Suggested step: {insight.actionText}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="suggestion-header" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
        Guidance refreshes as your task system changes
      </div>
    </aside>
  );
}

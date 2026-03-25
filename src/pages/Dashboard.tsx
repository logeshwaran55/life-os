import SuggestionPanel from "../components/SuggestionPanel";
import AdaptiveInsightsPanel from "../components/AdaptiveInsightsPanel";
import SystemStateIndicator from "../components/SystemStateIndicator";
import NextActionCard from "../components/NextActionCard";
import IntentInput from "../components/IntentInput";
import TaskHistoryViewer from "../components/TaskHistoryViewer";
import SystemOrchestratorPanel from "../components/SystemOrchestratorPanel";
import ScheduleView from "../components/ScheduleView";
import type { Task } from "../types/column";
import type { SmartInsight, RecommendedTask } from "../utils/smartEngine";
import type { AdaptiveIntelligenceResult } from "../utils/adaptiveEngine";
import type { NextActionResult } from "../utils/decisionEngine";
import type { SystemState } from "../utils/systemState";
import type { ParsedIntent } from "../utils/intentParser";
import type { OrchestratorResult } from "../utils/orchestrator";

type Props = {
  greeting: string;
  heroTodayLine: string;
  heroFriendlyMessage: string;
  productivityScore: number;
  weeklyProgressText: string;
  showOnboarding: boolean;
  needsNameSetup: boolean;
  onStartFirstTask: () => void;
  onSetName: () => void;
  systemState: SystemState;
  actionCtaLabel: string;
  actionGuidance: string;
  todayTasksCount: number;
  focusTasksCount: number;
  insightsCount: number;
  onPrimaryAction: () => void;
  insights: SmartInsight[];
  nextAction: NextActionResult;
  tasks: Task[];
  onParsedIntent: (parsed: ParsedIntent) => void;
  focusTasks: Task[];
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  onOpenTaskInTable: () => void;
  orchestrator: OrchestratorResult;
  displayedTasks: Task[];
  intelligenceDateColumnId: string;
  onReorderScheduledTask: (sourceTaskId: string, targetTaskId: string) => void;
  showSuggestions: boolean;
  nextTask: RecommendedTask | null;
  adaptiveIntelligence: AdaptiveIntelligenceResult;
};

const getTaskTitle = (task: Task): string => {
  const raw = task.values.name;
  return typeof raw === "string" && raw.trim() ? raw.trim() : "Untitled task";
};

export default function Dashboard({
  greeting,
  heroTodayLine,
  heroFriendlyMessage,
  productivityScore,
  weeklyProgressText,
  showOnboarding,
  needsNameSetup,
  onStartFirstTask,
  onSetName,
  systemState,
  actionCtaLabel,
  actionGuidance,
  todayTasksCount,
  focusTasksCount,
  insightsCount,
  onPrimaryAction,
  insights,
  nextAction,
  tasks,
  onParsedIntent,
  focusTasks,
  isFocusMode,
  onToggleFocusMode,
  onOpenTaskInTable,
  orchestrator,
  displayedTasks,
  intelligenceDateColumnId,
  onReorderScheduledTask,
  showSuggestions,
  nextTask,
  adaptiveIntelligence,
}: Props) {
  const nextActionLabel = nextAction.nextBestTask
    ? `Start with ${nextAction.nextBestTask.title}`
    : "You are caught up. Review upcoming work.";

  return (
    <div className="view-frame dashboard-mode dashboard-page">
      <section className="dashboard-summary-grid" aria-label="Performance summary">
        <article className="card section-card summary-card">
          <p className="summary-label">Productivity Score</p>
          <h3 className="summary-value">{productivityScore}</h3>
          <p className="summary-meta">Based on completion, streak, and overdue load.</p>
        </article>
        <article className="card section-card summary-card">
          <p className="summary-label">Weekly Progress</p>
          <h3 className="summary-value">{weeklyProgressText}</h3>
          <p className="summary-meta">Track consistency across the last 7 days.</p>
        </article>
      </section>

      {showOnboarding ? (
        <section className="card section-card onboarding-card" aria-label="Quick setup onboarding">
          <h3 className="dashboard-section-title">Welcome to LifeOS 👋</h3>
          <p className="dashboard-section-subtitle">Complete quick setup to make your workspace feel personal and useful.</p>
          <div className="onboarding-actions">
            <button className="btn btn-primary" onClick={onStartFirstTask}>Add first task</button>
            {needsNameSetup ? (
              <button className="btn btn-ghost" onClick={onSetName}>Set name</button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="hero-panel card section-card" aria-label="Daily guidance">
        <div className="hero-left">
          <p className="hero-kicker">{greeting} 👋</p>
          <h2 className="hero-title">{heroTodayLine}</h2>
          <p className="hero-subtitle">{heroFriendlyMessage}</p>
        </div>
        <div className="hero-right">
          <div className={`hero-state-chip ${systemState}`}>System mode: {systemState}</div>
        </div>
      </section>

      <section className="dashboard-middle-grid" aria-label="Action and insights">
        <section className="action-panel card section-card" aria-label="Primary action">
          <div>
            <h3 className="dashboard-section-title">What should you do now?</h3>
            <p className="dashboard-section-subtitle">Pick one clear action and move forward with confidence.</p>
            <p className="action-guidance">{actionGuidance}</p>
            <div className="action-spotlight">
              <span className="action-spotlight-label">Next action</span>
              <p className="action-spotlight-text">{nextActionLabel}</p>
            </div>
            <div className="action-meta-row" aria-label="Action context">
              <span className="action-meta-chip">Today: {todayTasksCount}</span>
              <span className="action-meta-chip">Focus tasks: {focusTasksCount}</span>
              <span className="action-meta-chip">Insights: {insightsCount}</span>
            </div>
          </div>
          <button className="btn btn-primary action-cta" onClick={onPrimaryAction}>
            {actionCtaLabel}
          </button>
        </section>

        <section className="insights-section" aria-label="Smart insights">
          <div className="insights-header">
            <h3 className="dashboard-section-title">Smart insights</h3>
            <p className="dashboard-section-subtitle">Signals from your system to guide attention and decisions.</p>
          </div>
          <div className="insights-card-grid">
            {insights.length === 0 ? (
              <article className="smart-insight-card info">
                <h4 className="smart-insight-title">No active alerts</h4>
                <p className="smart-insight-detail">You're in a stable state. Keep shipping meaningful work.</p>
              </article>
            ) : (
              insights.map((insight) => (
                <article key={insight.id} className={`smart-insight-card ${insight.type}`}>
                  <h4 className="smart-insight-title">{insight.message}</h4>
                  {insight.detail ? <p className="smart-insight-detail">{insight.detail}</p> : null}
                </article>
              ))
            )}
          </div>
        </section>
      </section>

      <div className="core-system-grid">
        <div className="card section-card">
          <SystemStateIndicator state={systemState} />
          <NextActionCard nextAction={nextAction} />
        </div>
        <div className="card section-card">
          <IntentInput onParsedIntent={onParsedIntent} />
          <TaskHistoryViewer tasks={tasks} />
        </div>
      </div>

      <section className="focus-strip card section-card">
        <div className="focus-strip-header">
          <div>
            <h3 className="focus-strip-title">Focus Tasks</h3>
            <p className="focus-strip-subtitle">Highest urgency items that deserve your attention now.</p>
          </div>
          <button className="btn btn-ghost" onClick={onToggleFocusMode}>
            {isFocusMode ? "Disable Focus Mode" : "Enable Focus Mode"}
          </button>
        </div>
        <div className="focus-task-list">
          {focusTasks.length === 0 ? (
            <p className="human-empty">No urgent tasks right now. Great control. Use this time for strategic work.</p>
          ) : (
            focusTasks.slice(0, 4).map((task) => (
              <div key={task.id} className="focus-task-item">
                <div className="focus-task-name">{getTaskTitle(task)}</div>
                <button className="btn btn-ghost" onClick={onOpenTaskInTable}>Open in tasks</button>
              </div>
            ))
          )}
        </div>
      </section>

      <SystemOrchestratorPanel result={orchestrator} tasks={tasks} />

      <div className={`content-grid ${showSuggestions ? "" : "no-suggestions"}`}>
        <div className="card section-card">
          <ScheduleView
            tasks={displayedTasks}
            dateColumnId={intelligenceDateColumnId}
            onReorderTask={onReorderScheduledTask}
          />
        </div>
        {showSuggestions && (
          <div className="side-panels">
            <SuggestionPanel insights={insights} nextTask={nextTask} />
            <AdaptiveInsightsPanel adaptive={adaptiveIntelligence} />
          </div>
        )}
      </div>
    </div>
  );
}

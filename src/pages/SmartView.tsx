import SuggestionPanel from "../components/SuggestionPanel";
import AdaptiveInsightsPanel from "../components/AdaptiveInsightsPanel";
import SmartViewComponent from "../components/SmartView";
import type { AdaptiveIntelligenceResult } from "../utils/adaptiveEngine";
import type { RecommendedTask, SmartInsight } from "../utils/smartEngine";

type LegacyTask = {
  id: string;
  text: string;
  completed: boolean;
  dueDate: string;
  priority: "low" | "medium" | "high";
};

type Props = {
  legacyTasks: LegacyTask[];
  insights: SmartInsight[];
  nextTask: RecommendedTask | null;
  adaptiveIntelligence: AdaptiveIntelligenceResult;
  onToggleComplete: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<LegacyTask>) => void;
};

export default function SmartViewPage({
  legacyTasks,
  insights,
  nextTask,
  adaptiveIntelligence,
  onToggleComplete,
  onDeleteTask,
  onUpdateTask,
}: Props) {
  return (
    <div className="view-frame">
      <section className="card section-card">
        <h2 className="dashboard-section-title">Smart View</h2>
        <p className="dashboard-section-subtitle">
          Let LifeOS rank tasks by urgency and impact so you always work on what matters most.
        </p>
      </section>

      <div className="content-grid">
        <section className="card section-card">
          <SmartViewComponent
            tasks={legacyTasks}
            toggleComplete={onToggleComplete}
            deleteTask={onDeleteTask}
            updateTask={onUpdateTask}
          />
        </section>

        <aside className="side-panels">
          <SuggestionPanel insights={insights} nextTask={nextTask} />
          <AdaptiveInsightsPanel adaptive={adaptiveIntelligence} />
        </aside>
      </div>
    </div>
  );
}

import type { Task } from "../types/column";
import type { OrchestratorResult } from "../utils/orchestrator";

type Props = {
  result: OrchestratorResult;
  tasks: Task[];
};

const getTaskTitle = (task: Task): string => {
  const raw = task.values.name;
  return typeof raw === "string" && raw.trim() ? raw.trim() : "Untitled task";
};

export default function SystemOrchestratorPanel({ result, tasks }: Props) {
  const todayPlanTaskIds = result.schedule.timeline
    .filter((entry) => entry.dayOffset === 0 && entry.kind === "task" && entry.taskId)
    .map((entry) => entry.taskId as string);

  const taskById = new Map(tasks.map((task) => [task.id, task]));

  return (
    <section className="orchestrator-panel">
      <div className="orchestrator-header">System Guidance Hub</div>

      <div className="orchestrator-state">
        <span className={`orchestrator-badge ${result.systemState}`}>Mode: {result.systemState}</span>
      </div>

      <div className="orchestrator-block">
        <div className="orchestrator-title">What LifeOS Recommends</div>
        <div className="orchestrator-text">{result.recommendations.systemRecommendation}</div>
      </div>

      <div className="orchestrator-block">
        <div className="orchestrator-title">Best Next Action</div>
        <div className="orchestrator-text">{result.recommendations.nextAction}</div>
      </div>

      <div className="orchestrator-block">
        <div className="orchestrator-title">Today Plan</div>
        <div className="orchestrator-text">{result.recommendations.todaysPlan}</div>
        <ul className="orchestrator-list">
          {todayPlanTaskIds.slice(0, 5).map((taskId) => {
            const task = taskById.get(taskId);
            if (!task) return null;
            return <li key={taskId}>{getTaskTitle(task)}</li>;
          })}
          {todayPlanTaskIds.length === 0 && <li>No scheduled tasks yet. Add one meaningful task to start strong.</li>}
        </ul>
      </div>
    </section>
  );
}

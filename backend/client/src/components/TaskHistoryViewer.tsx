import { useMemo, useState } from "react";
import type { Task } from "../types/column";
import { getTaskHistory } from "../utils/events";

type Props = {
  tasks: Task[];
};

const getTaskTitle = (task: Task): string => {
  const raw = task.values.name;
  return typeof raw === "string" && raw.trim() ? raw.trim() : "Untitled task";
};

export default function TaskHistoryViewer({ tasks }: Props) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>(tasks[0]?.id ?? "");

  const history = useMemo(() => {
    if (!selectedTaskId) {
      return [];
    }
    return getTaskHistory(selectedTaskId);
  }, [selectedTaskId]);

  return (
    <div className="task-history-card">
      <div className="task-history-title">Task History</div>
      <select
        className="select"
        value={selectedTaskId}
        onChange={(e) => setSelectedTaskId(e.target.value)}
      >
        {tasks.map((task) => (
          <option key={task.id} value={task.id}>
            {getTaskTitle(task)}
          </option>
        ))}
      </select>

      <div className="task-history-list">
        {history.length === 0 ? (
          <div className="task-history-empty">No events for selected task.</div>
        ) : (
          history.slice(0, 8).map((event) => (
            <div key={event.id} className="task-history-item">
              <div className="task-history-type">{event.type}</div>
              <div className="task-history-time">{new Date(event.timestamp).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

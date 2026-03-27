import TaskItem from "./TaskItem";
import { calculateTaskScore, isUrgent, formatTaskUrgency, getUrgencyColor, sortByScore } from "../utils/taskScoring";

type Task = {
  id: string;
  text: string;
  completed: boolean;
  dueDate: string;
  priority: "low" | "medium" | "high";
};

type Props = {
  tasks: Task[];
  toggleComplete: (id: string) => void;
  deleteTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
};

/**
 * SmartView Component
 * 
 * Shows tasks in recommended execution order based on:
 * 1. Task score (urgency + priority)
 * 2. Visual urgency indicators (red border for critical)
 * 3. "Recommended" badge for top 3 tasks
 * 
 * This is the "intelligent scheduler" of LifeOS
 */
export default function SmartView({
  tasks,
  toggleComplete,
  deleteTask,
  updateTask,
}: Props) {
  // Sort tasks by score (highest first = most urgent)
  const sortedTasks = sortByScore(tasks);

  // Show empty state
  if (sortedTasks.length === 0) {
    return (
      <div
        style={{
          marginTop: "30px",
          padding: "40px 20px",
          textAlign: "center",
          color: "#999",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          border: "2px dashed #ddd",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "10px" }}>🧠</div>
        <p style={{ margin: "0", fontSize: "16px", fontWeight: "bold" }}>
          No tasks to prioritize
        </p>
        <p style={{ margin: "8px 0 0 0", fontSize: "14px" }}>
          Create tasks and LifeOS will intelligently order them!
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "30px" }}>
      {/* ==================== SMART VIEW HEADER ==================== */}
      <div
        style={{
          padding: "15px",
          backgroundColor: "#f0f7ff",
          border: "2px solid #0066cc",
          borderRadius: "8px",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontSize: "14px", color: "#0066cc", fontWeight: "bold" }}>
          🧠 Smart Priority Order
        </div>
        <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
          Tasks automatically sorted by urgency and priority
        </div>
      </div>

      {/* ==================== TASKS LIST ==================== */}
      <ul style={{ marginTop: "15px", listStyle: "none", padding: 0 }}>
        {sortedTasks.map((task, index) => {
          const score = calculateTaskScore(task);
          const urgent = isUrgent(task);
          const isTopThree = index < 3;

          return (
            <div key={task.id} style={{ position: "relative", marginBottom: "20px" }}>
              {/* ==================== RECOMMENDED BADGE ==================== */}
              {isTopThree && (
                <div
                  style={{
                    position: "absolute",
                    top: "-8px",
                    right: "10px",
                    backgroundColor: "#6c63ff",
                    color: "white",
                    padding: "4px 10px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    zIndex: 10,
                  }}
                >
                  ⭐ #{index + 1} Recommended
                </div>
              )}

              {/* ==================== URGENCY INDICATOR BORDER ==================== */}
              <div
                style={{
                  borderLeft: urgent ? "6px solid " + getUrgencyColor(task) : "6px solid #ddd",
                  paddingLeft: "15px",
                  transition: "all 0.2s",
                }}
              >
                {/* Score and Urgency Info */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                    fontSize: "12px",
                    color: "#666",
                  }}
                >
                  <span>
                    <strong>Score:</strong> {Math.round(score)}
                  </span>
                  <span style={{ color: getUrgencyColor(task) ? "#d32f2f" : "#999" }}>
                    {formatTaskUrgency(task.dueDate)}
                  </span>
                </div>

                {/* Task Item */}
                <TaskItem
                  task={task}
                  toggleComplete={toggleComplete}
                  deleteTask={deleteTask}
                  updateTask={updateTask}
                />
              </div>
            </div>
          );
        })}
      </ul>

      {/* ==================== TASK SUMMARY ==================== */}
      <div
        style={{
          marginTop: "30px",
          padding: "15px",
          backgroundColor: "#f5f5f5",
          borderRadius: "8px",
          fontSize: "13px",
          color: "#666",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "8px" }}>Summary:</div>
        <div>
          • Total tasks: <strong>{sortedTasks.length}</strong>
        </div>
        <div>
          • Urgent tasks: <strong>{sortedTasks.filter(isUrgent).length}</strong>
        </div>
        <div>
          • Avg score: <strong>{Math.round(sortedTasks.reduce((sum, t) => sum + calculateTaskScore(t), 0) / sortedTasks.length)}</strong>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";

type Task = {
  id: string;
  text: string;
  completed: boolean;
  dueDate: string;
  priority: "low" | "medium" | "high";
};

type Props = {
  task: Task;
  toggleComplete: (id: string) => void;
  deleteTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
};

/**
 * Helper: Get color for priority level
 * Used for visual hierarchy and consistency
 */
const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case "high":
      return "#ff4444";
    case "medium":
      return "#ff9800";
    case "low":
      return "#4caf50";
    default:
      return "#999";
  }
};

/**
 * Helper: Format date for display
 * Example: "2026-03-20" → "Mar 20"
 */
const formatDate = (dateString: string): string => {
  if (!dateString) return "No date";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

export default function TaskItem({
  task,
  toggleComplete,
  deleteTask,
  updateTask,
}: Props) {
  // Edit mode state - tracks whether user is editing
  const [isEditing, setIsEditing] = useState(false);

  // Temporary state for edited values (only used during editing)
  const [editText, setEditText] = useState(task.text);
  const [editDate, setEditDate] = useState(task.dueDate);
  const [editPriority, setEditPriority] = useState(task.priority);

  /**
   * Save changes and exit edit mode
   * Only updates if text is not empty
   */
  const handleSave = () => {
    if (editText.trim() === "") return;

    updateTask(task.id, {
      text: editText,
      dueDate: editDate,
      priority: editPriority,
    });

    setIsEditing(false);
  };

  /**
   * Cancel editing and discard changes
   * Reset temp state to original task values
   */
  const handleCancel = () => {
    setEditText(task.text);
    setEditDate(task.dueDate);
    setEditPriority(task.priority);
    setIsEditing(false);
  };

  // ==================== EDIT MODE ====================
  if (isEditing) {
    return (
      <li
        className="task-item"
        style={{
          borderLeftColor: getPriorityColor(editPriority),
          borderWidth: "2px",
        }}
      >
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="input"
        />

        <div className="controls-row">
          <input
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            className="date-input"
          />

          <select
            value={editPriority}
            onChange={(e) => setEditPriority(e.target.value as "low" | "medium" | "high")}
            className="select"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="task-actions">
          <button onClick={handleSave} className="btn btn-success">Save</button>
          <button onClick={handleCancel} className="btn">Cancel</button>
        </div>
      </li>
    );
  }

  return (
    <li
      className={`task-item ${task.completed ? "completed" : ""}`}
      style={{ borderLeftColor: getPriorityColor(task.priority) }}
    >
      <div
        onClick={() => setIsEditing(true)}
        className="task-title cell-clickable"
        style={{ textDecoration: task.completed ? "line-through" : "none" }}
        onMouseEnter={(e) => {
          if (!task.completed) {
            (e.currentTarget as HTMLDivElement).style.backgroundColor = "var(--surface-hover)";
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
        }}
      >
        {task.text}
      </div>

      <div className="task-meta">
        <span>📅 {formatDate(task.dueDate)}</span>
        <span
          className="priority-badge"
          style={{ backgroundColor: getPriorityColor(task.priority) }}
        >
          {task.priority.toUpperCase()}
        </span>
      </div>

      <div className="task-actions">
        <button
          onClick={() => toggleComplete(task.id)}
          className="btn"
          title={task.completed ? "Mark as pending" : "Mark as complete"}
        >
          {task.completed ? "↩" : "✔"}
        </button>

        <button onClick={() => setIsEditing(true)} className="btn btn-primary">
          Edit
        </button>

        <button onClick={() => deleteTask(task.id)} className="btn btn-danger">
          Delete
        </button>
      </div>
    </li>
  );
}

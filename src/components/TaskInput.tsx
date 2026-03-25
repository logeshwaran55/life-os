type Props = {
  taskInput: string;
  setTaskInput: (value: string) => void;
  dueDate: string;
  setDueDate: (value: string) => void;
  priority: "low" | "medium" | "high";
  setPriority: (value: "low" | "medium" | "high") => void;
  addTask: () => void;
};

export default function TaskInput({
  taskInput,
  setTaskInput,
  dueDate,
  setDueDate,
  priority,
  setPriority,
  addTask,
}: Props) {
  return (
    <div className="input-row">
      <input
        type="text"
        placeholder="Enter a task..."
        value={taskInput}
        onChange={(e) => setTaskInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            addTask();
          }
        }}
        className="input"
      />

      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="date-input"
      />

      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
        className="select"
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      <button onClick={addTask} className="btn btn-primary">
        Add Task
      </button>
    </div>
  );
}
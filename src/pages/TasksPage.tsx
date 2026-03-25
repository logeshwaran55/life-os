import TaskInput from "../components/TaskInput";
import Table from "../components/Table";
import EmptyState from "../components/EmptyState";
import type { CellValue, Column, ColumnType, Task } from "../types/column";

type Props = {
  taskName: string;
  setTaskName: (value: string) => void;
  dueDate: string;
  setDueDate: (value: string) => void;
  priority: "low" | "medium" | "high";
  setPriority: (value: "low" | "medium" | "high") => void;
  addTask: () => void;
  filter: "all" | "completed" | "pending";
  setFilter: (value: "all" | "completed" | "pending") => void;
  sortBy: "none" | "priority" | "dueDate";
  setSortBy: (value: "none" | "priority" | "dueDate") => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  showSuggestions: boolean;
  onToggleSuggestions: () => void;
  smartInsightCount: number;
  columns: Column[];
  displayedTasks: Task[];
  tasks: Task[];
  onUpdateTask: (taskId: string, columnId: string, newValue: CellValue) => void;
  onDeleteTask: (id: string) => void;
  onDuplicateRows: (rowIds: string[]) => void;
  onAddRow: () => void;
  onToggleComplete: (id: string) => void;
  onDeleteRows: (rowIds: string[]) => void;
  onBulkCompleteRows: (rowIds: string[]) => void;
  onRenameColumn: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onMoveColumn: (columnId: string, direction: "left" | "right") => void;
  onEditSelectOptions: (columnId: string) => void;
  isAddingColumn: boolean;
  setIsAddingColumn: (value: boolean) => void;
  newColumnName: string;
  setNewColumnName: (value: string) => void;
  newColumnType: ColumnType;
  setNewColumnType: (value: ColumnType) => void;
  newColumnSelectOptions: string;
  setNewColumnSelectOptions: (value: string) => void;
  columnBuilderError: string;
  setColumnBuilderError: (value: string) => void;
  addColumn: () => void;
  streakCurrent: number;
  streakBest: number;
  tasksPerDay: number;
  productivityLevel: string;
};

export default function TasksPage({
  taskName,
  setTaskName,
  dueDate,
  setDueDate,
  priority,
  setPriority,
  addTask,
  filter,
  setFilter,
  sortBy,
  setSortBy,
  isFocusMode,
  onToggleFocusMode,
  showSuggestions,
  onToggleSuggestions,
  smartInsightCount,
  columns,
  displayedTasks,
  tasks,
  onUpdateTask,
  onDeleteTask,
  onDuplicateRows,
  onAddRow,
  onToggleComplete,
  onDeleteRows,
  onBulkCompleteRows,
  onRenameColumn,
  onDeleteColumn,
  onMoveColumn,
  onEditSelectOptions,
  isAddingColumn,
  setIsAddingColumn,
  newColumnName,
  setNewColumnName,
  newColumnType,
  setNewColumnType,
  newColumnSelectOptions,
  setNewColumnSelectOptions,
  columnBuilderError,
  setColumnBuilderError,
  addColumn,
  streakCurrent,
  streakBest,
  tasksPerDay,
  productivityLevel,
}: Props) {
  return (
    <div className="view-frame table-mode tasks-page">
      <section className="card section-card tasks-hero">
        <h2 className="dashboard-section-title">Task Manager</h2>
        <p className="dashboard-section-subtitle">Create, edit, and organize tasks in a clean working environment.</p>

        <TaskInput
          taskInput={taskName}
          setTaskInput={setTaskName}
          dueDate={dueDate}
          setDueDate={setDueDate}
          priority={priority}
          setPriority={setPriority}
          addTask={addTask}
        />

        <div className="controls-row">
          <span className="controls-label">Filter</span>
          <button className={`btn btn-ghost ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>All</button>
          <button className={`btn btn-ghost ${filter === "completed" ? "active" : ""}`} onClick={() => setFilter("completed")}>Completed</button>
          <button className={`btn btn-ghost ${filter === "pending" ? "active" : ""}`} onClick={() => setFilter("pending")}>Pending</button>
        </div>

        <div className="controls-row">
          <span className="controls-label">Sort</span>
          <button className={`btn btn-ghost ${sortBy === "none" ? "active" : ""}`} onClick={() => setSortBy("none")}>None</button>
          <button className={`btn btn-ghost ${sortBy === "priority" ? "active" : ""}`} onClick={() => setSortBy("priority")}>Priority</button>
          <button className={`btn btn-ghost ${sortBy === "dueDate" ? "active" : ""}`} onClick={() => setSortBy("dueDate")}>Due Date</button>
        </div>

        <div className="controls-row">
          <span className="controls-label">Workflow</span>
          <button className={`btn ${isFocusMode ? "btn-primary" : "btn-ghost"}`} onClick={onToggleFocusMode}>
            Focus Mode {isFocusMode ? "On" : "Off"}
          </button>
          <button className={`btn ${showSuggestions ? "btn-primary" : ""}`} onClick={onToggleSuggestions}>
            Smart Insights {smartInsightCount > 0 ? `(${smartInsightCount})` : ""}
          </button>
        </div>

        <div className="controls-row">
          <span className="controls-label">System Health</span>
          <span className="smart-kpi">🔥 Streak {streakCurrent}d (Best {streakBest}d)</span>
          <span className="smart-kpi">📊 {tasksPerDay} tasks/day</span>
          <span className="smart-kpi">🧭 Productivity {productivityLevel}</span>
        </div>
      </section>

      <div className="content-grid no-suggestions tasks-content-grid">
        <section className="card section-card tasks-table-shell">
          {tasks.length === 0 ? (
            <EmptyState
              icon="🚀"
              title="You're all set!"
              message="Start by adding your first task and build your momentum."
              actionText="Add first task"
              onAction={onAddRow}
              secondaryText="Tip: Add due date and priority for smarter scheduling."
            />
          ) : null}

          <Table
            columns={columns}
            rows={displayedTasks}
            onUpdateCell={onUpdateTask}
            onDeleteRow={onDeleteTask}
            onDuplicateRow={(rowId) => onDuplicateRows([rowId])}
            onAddRow={onAddRow}
            onToggleComplete={onToggleComplete}
            onDeleteRows={onDeleteRows}
            onDuplicateRows={onDuplicateRows}
            onBulkCompleteRows={onBulkCompleteRows}
            onRenameColumn={onRenameColumn}
            onDeleteColumn={onDeleteColumn}
            onMoveColumn={onMoveColumn}
            onEditSelectOptions={onEditSelectOptions}
          />

          <div className="summary-text">
            {displayedTasks.length === 0
              ? tasks.length === 0
                ? "You're all set! Add your first task 🚀"
                : "Nothing matches these filters yet. Try adjusting them to find tasks."
              : `You are viewing ${displayedTasks.length} task${displayedTasks.length !== 1 ? "s" : ""}.`}
          </div>

          <div className="controls-row">
            <span className="controls-label">Columns</span>
            <button className="btn btn-primary" onClick={() => setIsAddingColumn(!isAddingColumn)}>
              + Add Column
            </button>
          </div>

          {isAddingColumn && (
            <div className="column-builder">
              <input className="input" placeholder="Column name" value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} />
              <select className="select" value={newColumnType} onChange={(e) => {
                setNewColumnType(e.target.value as ColumnType);
                setColumnBuilderError("");
              }}>
                <option value="text">Text</option>
                <option value="date">Date</option>
                <option value="number">Number</option>
                <option value="select">Select</option>
              </select>
              {newColumnType === "select" && (
                <input
                  className="input column-options-input"
                  placeholder="Options (comma separated), e.g. Low, Medium, High"
                  value={newColumnSelectOptions}
                  onChange={(e) => {
                    setNewColumnSelectOptions(e.target.value);
                    setColumnBuilderError("");
                  }}
                />
              )}
              <button className="btn btn-primary" onClick={addColumn}>Add</button>
              <button className="btn btn-ghost" onClick={() => {
                setIsAddingColumn(false);
                setNewColumnName("");
                setNewColumnType("text");
                setNewColumnSelectOptions("");
                setColumnBuilderError("");
              }}>Cancel</button>
              {columnBuilderError && <p className="builder-error">{columnBuilderError}</p>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

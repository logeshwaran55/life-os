/**
 * ColumnType: Defines what data type a column contains
 */
export type ColumnType = "text" | "date" | "number" | "select";

export type CellValue = string | number | null;

/**
 * Option for select columns
 */
/**
 * Column: Defines the structure of a table column
 * - id: Unique identifier (e.g., "name", "dueDate", "priority")
 * - name: Display name (e.g., "Task Name")
 * - type: Data type for validation and rendering
 * - options: For select columns, list of available options
 */
export type Column = {
  id: string;
  name: string;
  type: ColumnType;
  options?: string[];
};

/**
 * Task with flexible column-based values
 * - id: Unique task identifier
 * - values: Map of columnId -> value (can be any type)
 * - completed: Whether task is marked done
 */
export type Task = {
  id: string;
  values: Record<string, CellValue>;
  createdAt: string;
  completed: boolean;
  completedAt: string | null;
};

/**
 * Default columns for the spreadsheet
 * Defines the initial column structure
 */
export const DEFAULT_COLUMNS: Column[] = [
  {
    id: "name",
    name: "Task Name",
    type: "text",
  },
  {
    id: "dueDate",
    name: "Due Date",
    type: "date",
  },
  {
    id: "priority",
    name: "Priority",
    type: "select",
    options: ["Low", "Medium", "High"],
  },
];

/**
 * Helper: Get default value for a column type
 */
export const getDefaultValueForColumn = (columnType: ColumnType): CellValue => {
  switch (columnType) {
    case "text":
      return "";
    case "date":
      return "";
    case "number":
      return 0;
    case "select":
      return "";
    default:
      return "";
  }
};

/**
 * Helper: Get column by ID
 */
export const findColumnById = (columns: Column[], columnId: string): Column | undefined => {
  return columns.find((col) => col.id === columnId);
};

/**
 * Helper: Create a deterministic column ID from a column name
 */
export const createColumnId = (columnName: string): string => {
  const normalized = columnName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-");
  return normalized || `column-${Date.now()}`;
};

/**
 * Helper: Create empty task with default column values
 */
export const createEmptyTask = (columns: Column[]): Task => {
  const values: Record<string, CellValue> = {};
  columns.forEach((column) => {
    values[column.id] = getDefaultValueForColumn(column.type);
  });
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    values,
    createdAt: new Date().toISOString(),
    completed: false,
    completedAt: null,
  };
};

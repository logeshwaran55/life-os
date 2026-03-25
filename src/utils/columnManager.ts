import type { CellValue, Column, Task } from "../types/column";

export type MoveDirection = "left" | "right";

export const renameColumn = (
  columns: Column[],
  columnId: string,
  nextName: string
): Column[] => {
  return columns.map((column) =>
    column.id === columnId ? { ...column, name: nextName } : column
  );
};

export const deleteColumn = (columns: Column[], columnId: string): Column[] => {
  return columns.filter((column) => column.id !== columnId);
};

export const removeColumnFromTasks = (tasks: Task[], columnId: string): Task[] => {
  return tasks.map((task) => {
    const nextValues: Record<string, CellValue> = { ...task.values };
    delete nextValues[columnId];

    return {
      ...task,
      values: nextValues,
    };
  });
};

export const moveColumn = (
  columns: Column[],
  columnId: string,
  direction: MoveDirection
): Column[] => {
  const currentIndex = columns.findIndex((column) => column.id === columnId);
  if (currentIndex === -1) {
    return columns;
  }

  const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= columns.length) {
    return columns;
  }

  const next = [...columns];
  const [item] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, item);
  return next;
};

export const parseSelectOptions = (rawInput: string): string[] => {
  const labels = rawInput
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(labels));
};

export const updateSelectOptions = (
  columns: Column[],
  columnId: string,
  options: string[]
): Column[] => {
  return columns.map((column) => {
    if (column.id !== columnId) {
      return column;
    }

    return {
      ...column,
      options,
    };
  });
};

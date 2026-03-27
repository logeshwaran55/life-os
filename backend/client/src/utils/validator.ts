import type { CellValue, Column, Task } from "../types/column";
import { getDefaultValueForColumn } from "../types/column";

export type ValidationError = {
  columnId: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  task: Task;
  errors: ValidationError[];
};

const isValidDateValue = (value: string): boolean => {
  if (!value.trim()) {
    return true;
  }

  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
};

const normalizeText = (value: CellValue): string => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return "";
};

const normalizeNumber = (value: CellValue): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
};

const normalizeDate = (value: CellValue): string => {
  const text = normalizeText(value).trim();
  if (!text) {
    return "";
  }

  if (!isValidDateValue(text)) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const parsed = new Date(text);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeSelect = (value: CellValue, options: string[]): string => {
  const text = normalizeText(value).trim();
  if (!text) {
    return options[0] ?? "";
  }

  const found = options.find((option) => option.toLowerCase() === text.toLowerCase());
  return found ?? (options[0] ?? "");
};

/**
 * Validate and sanitize a task against dynamic column definitions.
 * Invalid values are converted to safe defaults and returned in errors.
 */
export const validateTask = (task: Task, columns: Column[]): ValidationResult => {
  const errors: ValidationError[] = [];
  const nextValues: Record<string, CellValue> = { ...task.values };

  columns.forEach((column) => {
    const existing = nextValues[column.id];

    if (existing === undefined || existing === null) {
      nextValues[column.id] = getDefaultValueForColumn(column.type);
      return;
    }

    if (column.type === "text") {
      nextValues[column.id] = normalizeText(existing);
      return;
    }

    if (column.type === "number") {
      const normalized = normalizeNumber(existing);
      if (typeof existing === "string" && existing.trim() !== "" && Number.isNaN(Number(existing))) {
        errors.push({
          columnId: column.id,
          message: `Invalid number for ${column.name}. Defaulted to 0.`,
        });
      }
      nextValues[column.id] = normalized;
      return;
    }

    if (column.type === "date") {
      const normalized = normalizeDate(existing);
      if (normalizeText(existing).trim() && !normalized) {
        errors.push({
          columnId: column.id,
          message: `Invalid date for ${column.name}. Cleared value.`,
        });
      }
      nextValues[column.id] = normalized;
      return;
    }

    if (column.type === "select") {
      const options = column.options ?? [];
      const normalized = normalizeSelect(existing, options);
      if (normalizeText(existing).trim() && !options.some((opt) => opt.toLowerCase() === normalizeText(existing).trim().toLowerCase())) {
        errors.push({
          columnId: column.id,
          message: `Value for ${column.name} not in options. Defaulted to ${normalized || "empty"}.`,
        });
      }
      nextValues[column.id] = normalized;
    }
  });

  const sanitizedTask: Task = {
    ...task,
    values: nextValues,
    createdAt: task.createdAt || new Date().toISOString(),
    completedAt: task.completed ? task.completedAt ?? new Date().toISOString() : null,
  };

  return {
    valid: errors.length === 0,
    task: sanitizedTask,
    errors,
  };
};

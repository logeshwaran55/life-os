import type { CellValue, Column, ColumnType } from "../types/column";

type Props = {
  column: Column;
  value: CellValue;
  isEditing: boolean;
  onEdit: (newValue: CellValue) => void;
  onStart: () => void;
  onCancel: () => void;
};

/**
 * TableCell: Renders and edits a single cell value
 * - Display mode: Shows formatted value
 * - Edit mode: Shows appropriate input for column type (text, date, select, number)
 * - Handles value updates and cancellation
 */
export default function TableCell({
  column,
  value,
  isEditing,
  onEdit,
  onStart,
  onCancel,
}: Props) {
  const isValidDateString = (dateValue: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return false;
    }

    const [yearRaw, monthRaw, dayRaw] = dateValue.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    const date = new Date(dateValue);

    return (
      !Number.isNaN(date.getTime()) &&
      date.getUTCFullYear() === year &&
      date.getUTCMonth() + 1 === month &&
      date.getUTCDate() === day
    );
  };

  const sanitizeValueByType = (nextValue: string): CellValue => {
    switch (column.type) {
      case "number": {
        if (nextValue.trim() === "") {
          return 0;
        }

        const asNumber = Number(nextValue);
        return Number.isFinite(asNumber) ? asNumber : value;
      }
      case "date": {
        if (nextValue === "") {
          return "";
        }

        return isValidDateString(nextValue) ? nextValue : value;
      }
      case "select": {
        const validOption = column.options?.includes(nextValue);
        return validOption ? nextValue : value;
      }
      case "text":
      default:
        return nextValue;
    }
  };

  /**
   * Format value for display based on column type
   */
  const formatValue = (val: CellValue, type: ColumnType): string => {
    if (!val) return "—";
    switch (type) {
      case "date":
        return new Date(String(val)).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      case "select":
        return String(val);
      case "number":
        return String(val);
      case "text":
      default:
        return String(val);
    }
  };

  /**
   * Render input control based on column type
   */
  const renderInput = () => {
    switch (column.type) {
      case "text":
        return (
          <input
            type="text"
            className="table-cell-input"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onEdit(e.target.value)}
            autoFocus
            onBlur={onCancel}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCancel();
              if (e.key === "Escape") onCancel();
            }}
          />
        );

      case "date":
        return (
          <input
            type="date"
            className="table-cell-input"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onEdit(sanitizeValueByType(e.target.value))}
            autoFocus
            onBlur={onCancel}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCancel();
              if (e.key === "Escape") onCancel();
            }}
          />
        );

      case "number":
        return (
          <input
            type="number"
            className="table-cell-input"
            value={typeof value === "number" ? value : 0}
            onChange={(e) => onEdit(sanitizeValueByType(e.target.value))}
            autoFocus
            onBlur={onCancel}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCancel();
              if (e.key === "Escape") onCancel();
            }}
          />
        );

      case "select":
        return (
          <select
            className="table-cell-input"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onEdit(sanitizeValueByType(e.target.value))}
            autoFocus
            onBlur={onCancel}
          >
            <option value="">Select...</option>
            {column.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  return (
    <td
      className={`table-cell table-cell-data ${isEditing ? "editing" : ""}`}
      onClick={onStart}
      role="button"
      tabIndex={0}
    >
      {isEditing ? (
        renderInput()
      ) : (
        <span className="cell-value">{formatValue(value, column.type)}</span>
      )}
    </td>
  );
}

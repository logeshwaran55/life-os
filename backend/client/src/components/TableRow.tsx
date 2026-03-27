import { useState, type CSSProperties } from "react";
import type { CellValue, Column, Task } from "../types/column";
import TableCell from "./TableCell";
import RowActions from "./RowActions";

type Props = {
  columns: Column[];
  task: Task;
  rowIndex: number;
  animationState: "stable" | "entering" | "exiting";
  isSelected: boolean;
  onSelectRow: () => void;
  onUpdate: (columnId: string, newValue: CellValue) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleComplete: () => void;
};

type EditingCell = string | null;

/**
 * TableRow: Renders a single task row with editable cells
 * - Displays checkbox for task completion status
 * - Renders dynamic cells for each column
 * - Each cell can be edited inline
 * - Delete button for removing task
 */
export default function TableRow({
  columns,
  task,
  rowIndex,
  animationState,
  isSelected,
  onSelectRow,
  onUpdate,
  onDelete,
  onDuplicate,
  onToggleComplete,
}: Props) {
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState<CellValue>(null);

  /**
   * Handle cell edit cancellation
   */
  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue(null);
  };

  /**
   * Handle cell edit completion
   */
  const handleConfirmEdit = () => {
    if (editingCell && editValue !== null) {
      onUpdate(editingCell, editValue);
    }
    handleCancelEdit();
  };

  const rowStyle = {
    "--row-delay": `${Math.min(rowIndex, 12) * 26}ms`,
  } as CSSProperties;

  return (
    <tr
      className={`table-row ${task.completed ? "completed" : ""} ${
        isSelected ? "selected" : ""
      } row-${animationState}`}
      style={rowStyle}
    >
      {/* Row selection checkbox */}
      <td className="table-cell table-cell-checkbox">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelectRow}
          aria-label="Select row"
        />
      </td>

      {/* Dynamic column cells */}
      {columns.map((column) => (
        <TableCell
          key={column.id}
          column={column}
          value={editingCell === column.id ? editValue : task.values[column.id]}
          isEditing={editingCell === column.id}
          onStart={() => {
            setEditingCell(column.id);
            setEditValue(task.values[column.id]);
          }}
          onEdit={(newValue) => setEditValue(newValue)}
          onCancel={() => {
            if (editValue !== task.values[column.id]) {
              handleConfirmEdit();
            } else {
              handleCancelEdit();
            }
          }}
        />
      ))}

      {/* Actions cell */}
      <td className="table-cell table-cell-actions">
        <RowActions
          isCompleted={task.completed}
          onToggleComplete={onToggleComplete}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
}

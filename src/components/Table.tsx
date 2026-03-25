import { useEffect, useMemo, useRef, useState } from "react";
import type { CellValue, Column, Task } from "../types/column";
import TableHeader from "./TableHeader";
import TableRow from "./TableRow";

type Props = {
  columns: Column[];
  rows: Task[];
  onUpdateCell: (rowId: string, columnId: string, newValue: CellValue) => void;
  onDeleteRow: (rowId: string) => void;
  onDuplicateRow: (rowId: string) => void;
  onAddRow: () => void;
  onToggleComplete: (rowId: string) => void;
  onDeleteRows: (rowIds: string[]) => void;
  onDuplicateRows: (rowIds: string[]) => void;
  onBulkCompleteRows?: (rowIds: string[]) => void;
  onRenameColumn: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onMoveColumn: (columnId: string, direction: "left" | "right") => void;
  onEditSelectOptions: (columnId: string) => void;
};

export default function Table({
  columns,
  rows,
  onUpdateCell,
  onDeleteRow,
  onDuplicateRow,
  onAddRow,
  onToggleComplete,
  onDeleteRows,
  onDuplicateRows,
  onBulkCompleteRows,
  onRenameColumn,
  onDeleteColumn,
  onMoveColumn,
  onEditSelectOptions,
}: Props) {
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [renderedRows, setRenderedRows] = useState<Task[]>(rows);
  const [enteringRowIds, setEnteringRowIds] = useState<string[]>([]);
  const [exitingRowIds, setExitingRowIds] = useState<string[]>([]);
  const previousRowsRef = useRef<Task[]>(rows);
  const enterTimerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);

  const sortedRows = useMemo(() => {
    if (!sortBy) return renderedRows;

    const column = columns.find((col) => col.id === sortBy);
    if (!column) return rows;

    const sorted = [...renderedRows].sort((a, b) => {
      const aValue = a.values[sortBy];
      const bValue = b.values[sortBy];

      if (aValue === "" || aValue === null || aValue === undefined) return sortAsc ? 1 : -1;
      if (bValue === "" || bValue === null || bValue === undefined) return sortAsc ? -1 : 1;

      let comparison = 0;
      switch (column.type) {
        case "date":
          comparison = new Date(String(aValue)).getTime() - new Date(String(bValue)).getTime();
          break;
        case "number":
          comparison = Number(aValue) - Number(bValue);
          break;
        case "select":
        case "text":
        default:
          comparison = String(aValue).localeCompare(String(bValue));
          break;
      }

      return sortAsc ? comparison : -comparison;
    });

    return sorted;
  }, [renderedRows, columns, sortBy, sortAsc]);

  const selectedCount = selectedRowIds.length;
  const allRowsSelected = rows.length > 0 && selectedCount === rows.length;

  useEffect(() => {
    const previousRows = previousRowsRef.current;
    const previousRowIds = new Set(previousRows.map((row) => row.id));
    const nextRowById = new Map(rows.map((row) => [row.id, row]));

    const addedRowIds = rows
      .filter((row) => !previousRowIds.has(row.id))
      .map((row) => row.id);

    const removedRowIds = previousRows
      .filter((row) => !nextRowById.has(row.id))
      .map((row) => row.id);

    setRenderedRows((prev) => {
      const prevMap = new Map(prev.map((row) => [row.id, row]));
      const merged: Task[] = [];

      prev.forEach((row) => {
        merged.push(nextRowById.get(row.id) ?? row);
      });

      rows.forEach((row) => {
        if (!prevMap.has(row.id)) {
          merged.push(row);
        }
      });

      return merged;
    });

    if (addedRowIds.length > 0) {
      setEnteringRowIds((prev) => Array.from(new Set([...prev, ...addedRowIds])));
      if (enterTimerRef.current) {
        window.clearTimeout(enterTimerRef.current);
      }
      enterTimerRef.current = window.setTimeout(() => {
        setEnteringRowIds((prev) => prev.filter((id) => !addedRowIds.includes(id)));
      }, 420);
    }

    if (removedRowIds.length > 0) {
      const removedSet = new Set(removedRowIds);
      setExitingRowIds((prev) => Array.from(new Set([...prev, ...removedRowIds])));
      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
      }
      exitTimerRef.current = window.setTimeout(() => {
        setRenderedRows((prev) => prev.filter((row) => !removedSet.has(row.id)));
        setExitingRowIds((prev) => prev.filter((id) => !removedSet.has(id)));
      }, 220);
    }

    previousRowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    const visibleRowIds = new Set(rows.map((row) => row.id));
    setSelectedRowIds((prev) => prev.filter((id) => visibleRowIds.has(id)));
  }, [rows]);

  useEffect(() => {
    return () => {
      if (enterTimerRef.current) {
        window.clearTimeout(enterTimerRef.current);
      }
      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  const handleSort = (columnId: string) => {
    if (sortBy === columnId) {
      setSortAsc((prev) => !prev);
      return;
    }

    setSortBy(columnId);
    setSortAsc(true);
  };

  const handleToggleRow = (rowId: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );
  };

  const handleToggleAllRows = () => {
    setSelectedRowIds((prev) => (prev.length === rows.length ? [] : rows.map((row) => row.id)));
  };

  const handleBulkDelete = () => {
    if (selectedRowIds.length === 0) return;
    onDeleteRows(selectedRowIds);
    setSelectedRowIds([]);
  };

  const handleBulkDuplicate = () => {
    if (selectedRowIds.length === 0) return;
    onDuplicateRows(selectedRowIds);
    setSelectedRowIds([]);
  };

  const handleBulkComplete = () => {
    if (selectedRowIds.length === 0 || !onBulkCompleteRows) return;
    onBulkCompleteRows(selectedRowIds);
    setSelectedRowIds([]);
  };

  return (
    <div className="spreadsheet-shell">
      <div className="spreadsheet-toolbar">
        <button
          className="btn btn-primary"
          onClick={onAddRow}
        >
          + Add Row
        </button>
        <button
          className="btn btn-ghost"
          onClick={handleBulkDuplicate}
          disabled={selectedCount === 0}
        >
          Duplicate Selected ({selectedCount})
        </button>
        {onBulkCompleteRows && (
          <button
            className="btn btn-success"
            onClick={handleBulkComplete}
            disabled={selectedCount === 0}
          >
            ✓ Mark Complete ({selectedCount})
          </button>
        )}
        <button
          className="btn btn-danger"
          onClick={handleBulkDelete}
          disabled={selectedCount === 0}
        >
          Delete Selected ({selectedCount})
        </button>
      </div>

      {renderedRows.length === 0 ? (
        <div className="empty-state table-empty-state">
          <div className="empty-icon">📊</div>
          <p>
            <strong>No rows yet</strong>
          </p>
          <p>Use Add Row to create your first record.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="task-table">
            <TableHeader
              columns={columns}
              sortBy={sortBy}
              sortAsc={sortAsc}
              onSort={handleSort}
              allRowsSelected={allRowsSelected}
              onToggleAllRows={handleToggleAllRows}
              onRenameColumn={onRenameColumn}
              onDeleteColumn={onDeleteColumn}
              onMoveColumn={onMoveColumn}
              onEditSelectOptions={onEditSelectOptions}
            />
            <tbody>
              {sortedRows.map((row, index) => (
                <TableRow
                  key={row.id}
                  columns={columns}
                  task={row}
                  rowIndex={index}
                  animationState={
                    exitingRowIds.includes(row.id)
                      ? "exiting"
                      : enteringRowIds.includes(row.id)
                        ? "entering"
                        : "stable"
                  }
                  isSelected={selectedRowIds.includes(row.id)}
                  onSelectRow={() => handleToggleRow(row.id)}
                  onUpdate={(columnId, newValue) => onUpdateCell(row.id, columnId, newValue)}
                  onDelete={() => onDeleteRow(row.id)}
                  onDuplicate={() => onDuplicateRow(row.id)}
                  onToggleComplete={() => onToggleComplete(row.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

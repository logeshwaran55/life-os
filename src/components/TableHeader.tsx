import { useState } from "react";
import type { Column } from "../types/column";
import ColumnMenu from "./ColumnMenu";

type Props = {
  columns: Column[];
  sortBy: string | null;
  sortAsc: boolean;
  onSort: (columnId: string) => void;
  allRowsSelected: boolean;
  onToggleAllRows: () => void;
  onRenameColumn: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onMoveColumn: (columnId: string, direction: "left" | "right") => void;
  onEditSelectOptions: (columnId: string) => void;
};

/**
 * TableHeader: Renders dynamic column headers with sorting indicators
 * - Displays each column name
 * - Indicates current sort column and direction
 * - Clicking a header toggles sort on that column
 */
export default function TableHeader({
  columns,
  sortBy,
  sortAsc,
  onSort,
  allRowsSelected,
  onToggleAllRows,
  onRenameColumn,
  onDeleteColumn,
  onMoveColumn,
  onEditSelectOptions,
}: Props) {
  const [openMenuColumnId, setOpenMenuColumnId] = useState<string | null>(null);

  return (
    <thead>
      <tr className="table-header-row">
        {/* Selection column for bulk actions */}
        <th className="table-cell table-cell-checkbox">
          <input
            type="checkbox"
            checked={allRowsSelected}
            onChange={onToggleAllRows}
            aria-label="Select all rows"
          />
        </th>

        {/* Dynamic columns */}
        {columns.map((column) => (
          <th
            key={column.id}
            className={`table-cell table-cell-header ${
              sortBy === column.id ? "sortable active-sort" : "sortable"
            }`}
            onClick={() => onSort(column.id)}
            role="button"
            tabIndex={0}
          >
            <div className="table-header-content">
              <span className="table-header-title">{column.name}</span>
              <div className="table-header-actions">
                {sortBy === column.id && (
                  <span className="sort-indicator">{sortAsc ? "↑" : "↓"}</span>
                )}
                <button
                  type="button"
                  className="header-menu-trigger"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenMenuColumnId((prev) =>
                      prev === column.id ? null : column.id
                    );
                  }}
                  aria-label={`Column actions for ${column.name}`}
                >
                  ⋯
                </button>
              </div>
            </div>

            {openMenuColumnId === column.id && (
              <ColumnMenu
                column={column}
                isFirst={columns[0]?.id === column.id}
                isLast={columns[columns.length - 1]?.id === column.id}
                disableDelete={columns.length <= 1}
                onRename={(columnId) => {
                  onRenameColumn(columnId);
                  setOpenMenuColumnId(null);
                }}
                onDelete={(columnId) => {
                  onDeleteColumn(columnId);
                  setOpenMenuColumnId(null);
                }}
                onMove={(columnId, direction) => {
                  onMoveColumn(columnId, direction);
                  setOpenMenuColumnId(null);
                }}
                onEditOptions={(columnId) => {
                  onEditSelectOptions(columnId);
                  setOpenMenuColumnId(null);
                }}
              />
            )}
          </th>
        ))}

        {/* Actions column */}
        <th className="table-cell table-cell-actions">Actions</th>
      </tr>
    </thead>
  );
}

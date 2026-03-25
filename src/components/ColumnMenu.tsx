import type { Column } from "../types/column";

type Props = {
  column: Column;
  isFirst: boolean;
  isLast: boolean;
  disableDelete: boolean;
  onRename: (columnId: string) => void;
  onDelete: (columnId: string) => void;
  onMove: (columnId: string, direction: "left" | "right") => void;
  onEditOptions: (columnId: string) => void;
};

export default function ColumnMenu({
  column,
  isFirst,
  isLast,
  disableDelete,
  onRename,
  onDelete,
  onMove,
  onEditOptions,
}: Props) {
  return (
    <div
      className="header-menu"
      role="menu"
      aria-label={`Actions for ${column.name}`}
      onClick={(event) => event.stopPropagation()}
    >
      <button className="header-menu-item" onClick={() => onRename(column.id)}>
        Rename
      </button>
      <button
        className="header-menu-item"
        onClick={() => onMove(column.id, "left")}
        disabled={isFirst}
      >
        Move left
      </button>
      <button
        className="header-menu-item"
        onClick={() => onMove(column.id, "right")}
        disabled={isLast}
      >
        Move right
      </button>
      {column.type === "select" && (
        <button className="header-menu-item" onClick={() => onEditOptions(column.id)}>
          Edit options
        </button>
      )}
      <button
        className="header-menu-item danger"
        onClick={() => onDelete(column.id)}
        disabled={disableDelete}
      >
        Delete
      </button>
    </div>
  );
}

type Props = {
  isCompleted: boolean;
  onToggleComplete: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export default function RowActions({
  isCompleted,
  onToggleComplete,
  onDuplicate,
  onDelete,
}: Props) {
  return (
    <div className="row-actions">
      <button className="btn btn-ghost" onClick={onToggleComplete}>
        {isCompleted ? "Mark Pending" : "Mark Done"}
      </button>
      <button className="btn btn-ghost" onClick={onDuplicate}>
        Duplicate
      </button>
      <button className="btn btn-danger" onClick={onDelete}>
        Delete
      </button>
    </div>
  );
}

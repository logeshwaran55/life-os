/**
 * Reusable empty state component with smart guidance
 */

type EmptyStateProps = {
  icon: string;
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
  secondaryText?: string;
};

export function EmptyState({
  icon,
  title,
  message,
  actionText,
  onAction,
  secondaryText,
}: EmptyStateProps) {
  return (
    <div className="empty-state app-empty-state">
      <div className="empty-icon">{icon}</div>
      <div>
        <p className="empty-title">
          <strong>{title}</strong>
        </p>
        <p>{message}</p>
        {secondaryText && <p className="empty-secondary">{secondaryText}</p>}
      </div>
      {actionText && onAction && (
        <button onClick={onAction} className="btn btn-primary">
          {actionText}
        </button>
      )}
    </div>
  );
}

export default EmptyState;

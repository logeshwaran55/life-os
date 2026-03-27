/**
 * Reusable loading indicator component
 */

export function LoadingState() {
  return (
    <div className="loading-skeleton" aria-live="polite" aria-label="Loading workspace">
      <div className="loading-spinner" aria-hidden="true"></div>
      <div className="skeleton-row">
        <div className="skeleton-block skeleton-title"></div>
        <div className="skeleton-block skeleton-chip"></div>
      </div>
      <div className="skeleton-grid">
        <div className="skeleton-block skeleton-card"></div>
        <div className="skeleton-block skeleton-card"></div>
        <div className="skeleton-block skeleton-card"></div>
      </div>
      <div className="skeleton-block skeleton-line"></div>
      <div className="skeleton-block skeleton-line short"></div>
      <p className="skeleton-caption">Getting your workspace ready...</p>
    </div>
  );
}

export default LoadingState;

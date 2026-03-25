import type { AdaptiveIntelligenceResult } from "../utils/adaptiveEngine";

type Props = {
  adaptive: AdaptiveIntelligenceResult;
};

export default function AdaptiveInsightsPanel({ adaptive }: Props) {
  return (
    <aside className="adaptive-panel">
      <div className="adaptive-header">Adaptive Guidance</div>

      <div className="adaptive-summary">
        <div className="adaptive-stat">
          <div className="adaptive-label">Productivity</div>
          <div className="adaptive-value">{adaptive.patterns.productivityLevel}</div>
        </div>
        <div className="adaptive-stat">
          <div className="adaptive-label">Best Time</div>
          <div className="adaptive-value">{adaptive.behavior.preferredTime}</div>
        </div>
        <div className="adaptive-stat">
          <div className="adaptive-label">Completion Rate</div>
          <div className="adaptive-value">{adaptive.behavior.completionRate}%</div>
        </div>
      </div>

      <div className="adaptive-workload">
        <div className="adaptive-workload-title">Recommended workload today</div>
        <div className="adaptive-workload-range">
          {adaptive.workload.recommendedMin}-{adaptive.workload.recommendedMax} tasks
        </div>
        <div className="adaptive-workload-message">{adaptive.workload.message}</div>
      </div>

      <div className="adaptive-list">
        {adaptive.insights.map((insight) => (
          <div key={insight.id} className={`adaptive-item ${insight.type}`}>
            <div className="adaptive-item-title">{insight.message}</div>
            {insight.detail ? <div className="adaptive-item-detail">{insight.detail}</div> : null}
          </div>
        ))}
      </div>
    </aside>
  );
}

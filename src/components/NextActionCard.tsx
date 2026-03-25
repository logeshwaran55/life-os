import type { NextActionResult } from "../utils/decisionEngine";

type Props = {
  nextAction: NextActionResult;
};

export default function NextActionCard({ nextAction }: Props) {
  return (
    <div className="next-action-card">
      <div className="next-action-title">Your Next Best Move</div>
      <div className="next-action-message">{nextAction.recommendation}</div>
      {nextAction.nextBestTask ? (
        <div className="next-action-task">
          Start with <strong>{nextAction.nextBestTask.title}</strong>
        </div>
      ) : <div className="next-action-task">You are caught up. Use this space to plan tomorrow.</div>}
    </div>
  );
}

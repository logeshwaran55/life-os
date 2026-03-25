import type { SystemState } from "../utils/systemState";

type Props = {
  state: SystemState;
};

const getStateMessage = (state: SystemState): string => {
  if (state === "focus") {
    return "Focus mode: protect attention and finish one key task.";
  }
  if (state === "overload") {
    return "Overload detected: reduce scope and prioritize essentials.";
  }
  return "Balanced mode: keep steady progress and avoid overcommitting.";
};

export default function SystemStateIndicator({ state }: Props) {
  return (
    <div className="system-state-indicator">
      <span className={`system-state-pill ${state}`}>System mode: {state}</span>
      <p className="task-history-empty" style={{ margin: "8px 0 0" }}>{getStateMessage(state)}</p>
    </div>
  );
}

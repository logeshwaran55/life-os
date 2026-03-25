import AssistantPanel, { type AssistantMessage } from "../components/AssistantPanel";

type Props = {
  messages: AssistantMessage[];
  onSend: (input: string) => void;
};

export default function AssistantPage({ messages, onSend }: Props) {
  return (
    <div className="view-frame">
      <section className="card section-card">
        <h2 className="dashboard-section-title">Assistant Workspace</h2>
        <p className="dashboard-section-subtitle">
          Use natural language to update tasks, plan your day, and automate repetitive actions.
        </p>
      </section>

      <section className="card section-card assistant-shell">
        <AssistantPanel messages={messages} onSend={onSend} />
      </section>
    </div>
  );
}

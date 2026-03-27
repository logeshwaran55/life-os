import { useState } from "react";

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  kind?: "normal" | "action" | "warning";
  actions?: string[];
};

type Props = {
  messages: AssistantMessage[];
  onSend: (input: string) => void;
};

const COMMAND_OPTIONS = [
  { value: "", label: "Choose a command" },
  { value: "plan my day", label: "Plan my day" },
  { value: "what should i do", label: "What should I do" },
  { value: "show progress", label: "Show progress" },
  { value: "reschedule tasks", label: "Reschedule tasks" },
  { value: "add task ", label: "Add task (template)" },
];

export default function AssistantPanel({ messages, onSend }: Props) {
  const [input, setInput] = useState("");
  const [selectedCommand, setSelectedCommand] = useState("");

  const submit = (value?: string) => {
    const command = value ?? input;
    const trimmed = command.trim();
    if (!trimmed) return;

    onSend(trimmed);
    setInput("");
    setSelectedCommand("");
  };

  const applySelectedCommand = () => {
    if (!selectedCommand) return;

    if (selectedCommand === "add task ") {
      setInput("add task ");
      return;
    }

    submit(selectedCommand);
  };

  return (
    <div className="assistant-panel">
      <div className="assistant-header">Assistant Controller</div>

      <div className="assistant-log">
        {messages.map((message) => (
          <div
            key={message.id}
            className={[
              `assistant-message ${message.role}`,
              message.kind === "warning" ? "warning" : "",
              message.kind === "action" ? "action" : "",
            ].join(" ")}
          >
            <div className="assistant-role">
              {message.role === "user" ? "You" : "LifeOS Assistant"}
            </div>
            <div>{message.text}</div>
            {message.actions && message.actions.length > 0 && (
              <div className="assistant-actions">
                {message.actions.map((action) => (
                  <span key={action} className="assistant-action-pill">
                    {action}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="assistant-quick-row">
        <select
          className="select"
          value={selectedCommand}
          onChange={(event) => setSelectedCommand(event.target.value)}
        >
          {COMMAND_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          className="btn btn-ghost"
          onClick={applySelectedCommand}
        >
          Use
        </button>
      </div>

      <div className="assistant-input-row">
        <input
          className="input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Try: plan my day, what should I do, add task Prepare roadmap"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              submit();
            }
          }}
        />
        <button
          className="btn btn-primary"
          onClick={() => submit()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { parseUserIntent, type ParsedIntent } from "../utils/intentParser";

type Props = {
  onParsedIntent?: (intent: ParsedIntent) => void;
};

export default function IntentInput({ onParsedIntent }: Props) {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<ParsedIntent | null>(null);

  return (
    <div className="intent-card">
      <div className="intent-title">Tell LifeOS what you need</div>
      <div className="intent-row">
        <input
          className="input"
          value={input}
          placeholder="Try: plan my day, next action, show progress"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const result = parseUserIntent(input);
              setParsed(result);
              onParsedIntent?.(result);
            }
          }}
        />
        <button
          className="btn btn-primary"
          onClick={() => {
            const result = parseUserIntent(input);
            setParsed(result);
            onParsedIntent?.(result);
          }}
        >
          Apply Intent
        </button>
      </div>
      {parsed ? (
        <div className="intent-result">
          LifeOS understood <strong>{parsed.intent}</strong> and selected <strong>{parsed.action}</strong>.
        </div>
      ) : null}
    </div>
  );
}

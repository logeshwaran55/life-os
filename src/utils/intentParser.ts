export type ParsedIntent = {
  intent: string;
  action: string;
};

const hasAny = (text: string, keywords: string[]): boolean =>
  keywords.some((keyword) => text.includes(keyword));

/**
 * Keyword-based intent parser (pre-AI).
 */
export const parseUserIntent = (input: string): ParsedIntent => {
  const normalized = input.trim().toLowerCase();

  if (!normalized) {
    return {
      intent: "unknown",
      action: "showHelp",
    };
  }

  if (hasAny(normalized, ["plan my day", "plan today", "schedule"])) {
    return {
      intent: "plan_day",
      action: "openSchedule",
    };
  }

  if (hasAny(normalized, ["what should i do", "next task", "next action"])) {
    return {
      intent: "next_action",
      action: "showNextAction",
    };
  }

  if (hasAny(normalized, ["show progress", "progress", "stats", "dashboard"])) {
    return {
      intent: "show_progress",
      action: "openDashboard",
    };
  }

  if (hasAny(normalized, ["reduce tasks", "too much", "overload", "simplify"])) {
    return {
      intent: "reduce_tasks",
      action: "enableFocusMode",
    };
  }

  return {
    intent: "unknown",
    action: "showHelp",
  };
};

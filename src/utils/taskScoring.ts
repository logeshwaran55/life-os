/**
 * Task Scoring System
 * 
 * Calculates task urgency based on:
 * 1. Priority level (High, Medium, Low)
 * 2. Proximity to due date (days until due)
 * 
 * This is a senior pattern: Pure functions that are
 * - Testable
 * - Reusable
 * - Easy to understand
 */

type Task = {
  id: string;
  text: string;
  completed: boolean;
  dueDate: string;
  priority: "low" | "medium" | "high";
};

/**
 * Get priority score (base value)
 * High priority tasks should be done first
 */
const getPriorityScore = (priority: "low" | "medium" | "high"): number => {
  switch (priority) {
    case "high":
      return 100;
    case "medium":
      return 50;
    case "low":
      return 10;
  }
};

/**
 * Calculate days until task is due
 * Returns negative if overdue
 */
export const daysUntilDue = (dueDate: string): number => {
  if (!dueDate) return Infinity; // No due date = lowest priority
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Get urgency score based on due date proximity
 * 
 * Deadline scoring logic:
 * - Overdue (< 0 days):        +200 points (CRITICAL)
 * - Due today (0 days):        +150 points
 * - Due tomorrow (1 day):      +100 points
 * - Due this week (2-3 days):  +50 points
 * - Due soon (4-7 days):       +20 points
 * - Due later (8+ days):       0 points
 * - No due date:               0 points
 */
const getUrgencyScore = (dueDate: string): number => {
  const days = daysUntilDue(dueDate);
  
  if (days === Infinity) return 0;           // No due date
  if (days < 0) return 200;                  // Overdue
  if (days === 0) return 150;                // Due today
  if (days === 1) return 100;                // Due tomorrow
  if (days >= 2 && days <= 3) return 50;    // Due this week
  if (days >= 4 && days <= 7) return 20;    // Due soon
  return 0;                                   // No urgency
};

/**
 * MAIN: Calculate overall task score
 * 
 * Formula:
 * Score = PriorityScore + UrgencyScore
 * 
 * Why add them?
 * - They're on similar scales (0-200 range)
 * - Both factors equally important
 * - Higher score = more urgent to work on
 * 
 * Example calculations:
 * - High priority + due today   = 100 + 150 = 250 ⭐⭐⭐ (TOP)
 * - Medium priority + due soon = 50 + 20 = 70
 * - Low priority + no due date = 10 + 0 = 10 ⭐ (BOTTOM)
 */
export const calculateTaskScore = (task: Task): number => {
  if (task.completed) return -Infinity; // Completed tasks go to bottom
  
  const priorityScore = getPriorityScore(task.priority);
  const urgencyScore = getUrgencyScore(task.dueDate);
  
  return priorityScore + urgencyScore;
};

/**
 * Check if a task is "urgent"
 * Used to highlight tasks that need immediate attention
 * 
 * Criteria: A task is urgent if:
 * 1. Overdue (due date passed), OR
 * 2. Due within 1 day, OR
 * 3. High priority + due within 3 days
 */
export const isUrgent = (task: Task): boolean => {
  if (task.completed) return false;
  
  const days = daysUntilDue(task.dueDate);
  
  // Overdue or due today/tomorrow
  if (days < 2 && days !== Infinity) return true;
  
  // High priority tasks due within 3 days
  if (task.priority === "high" && days >= 0 && days <= 3) return true;
  
  return false;
};

/**
 * Format urgency message for display
 * Shows human-readable status like "Due in 2 days"
 */
export const formatTaskUrgency = (dueDate: string): string => {
  const days = daysUntilDue(dueDate);
  
  if (days === Infinity) return "No deadline";
  if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""}`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 7) return `Due in ${days} days`;
  
  return `Due in ${days} days`;
};

/**
 * Get urgency badge color for UI
 * Used to color-code task urgency
 */
export const getUrgencyColor = (task: Task): string => {
  if (!isUrgent(task)) return "transparent";
  
  const days = daysUntilDue(task.dueDate);
  
  if (days < 0 || days === 0) return "#ff4444";  // Red for overdue/today
  if (days === 1) return "#ff9800";               // Orange for tomorrow
  if (task.priority === "high") return "#ffc107"; // Yellow for high priority soon
  
  return "transparent";
};

/**
 * Utility: Sort tasks by score
 * Higher score = more urgent = shown first
 */
export const sortByScore = (tasks: Task[]): Task[] => {
  return [...tasks].sort((a, b) => {
    const scoreA = calculateTaskScore(a);
    const scoreB = calculateTaskScore(b);
    return scoreB - scoreA; // Descending: highest score first
  });
};

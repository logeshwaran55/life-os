/**
 * Simple undo/redo history manager
 * Stores snapshots of app state and allows navigation through history
 */

export type HistorySnapshot<T> = {
  state: T;
  description: string;
  timestamp: number;
};

export class HistoryManager<T> {
  private past: HistorySnapshot<T>[] = [];
  private future: HistorySnapshot<T>[] = [];
  private maxSnapshots: number = 50;

  constructor(initialState: T, maxSnapshots = 50) {
    this.past = [{ state: initialState, description: "Initial state", timestamp: Date.now() }];
    this.maxSnapshots = maxSnapshots;
  }

  /**
   * Record a new state change
   */
  public push(state: T, description: string) {
    // Add to past and clear future (new action invalidates redo)
    this.past.push({ state, description, timestamp: Date.now() });
    this.future = [];

    // Trim history if exceeds max
    if (this.past.length > this.maxSnapshots) {
      this.past = this.past.slice(-this.maxSnapshots);
    }
  }

  /**
   * Go back one step
   */
  public undo(): HistorySnapshot<T> | null {
    if (this.past.length <= 1) return null;

    const current = this.past.pop();
    if (!current) return null;

    this.future.unshift(current);
    return this.past[this.past.length - 1];
  }

  /**
   * Go forward one step
   */
  public redo(): HistorySnapshot<T> | null {
    if (this.future.length === 0) return null;

    const next = this.future.shift();
    if (!next) return null;

    this.past.push(next);
    return next;
  }

  /**
   * Get current state
   */
  public getCurrent(): T {
    return this.past[this.past.length - 1]?.state;
  }

  /**
   * Check if undo is available
   */
  public canUndo(): boolean {
    return this.past.length > 1;
  }

  /**
   * Check if redo is available
   */
  public canRedo(): boolean {
    return this.future.length > 0;
  }

  /**
   * Get history for debugging
   */
  public getHistory() {
    return {
      past: this.past.map((s) => s.description),
      future: this.future.map((s) => s.description),
    };
  }
}

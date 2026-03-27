/**
 * Global keyboard shortcuts management
 */

type KeyBindingHandler = (event: KeyboardEvent) => void;

interface KeyBinding {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: KeyBindingHandler;
}

class KeyboardManager {
  private bindings: KeyBinding[] = [];
  private isListening = false;

  /**
   * Register a keyboard shortcut
   */
  public register(binding: KeyBinding) {
    this.bindings.push(binding);
    this.ensureListening();
  }

  /**
   * Unregister all bindings
   */
  public unregister(key: string, ctrl?: boolean, shift?: boolean, alt?: boolean) {
    this.bindings = this.bindings.filter(
      (b) =>
        !(
          b.key === key &&
          b.ctrl === ctrl &&
          b.shift === shift &&
          b.alt === alt
        )
    );
  }

  /**
   * Clear all bindings
   */
  public clear() {
    this.bindings = [];
    this.stopListening();
  }

  /**
   * Start listening for keyboard events
   */
  private ensureListening() {
    if (this.isListening) return;
    window.addEventListener("keydown", this.handleKeydown);
    this.isListening = true;
  }

  /**
   * Stop listening
   */
  private stopListening() {
    window.removeEventListener("keydown", this.handleKeydown);
    this.isListening = false;
  }

  /**
   * Handle keydown event
   */
  private handleKeydown = (event: KeyboardEvent) => {
    // Don't capture if user is typing in an input
    const target = event.target as HTMLElement;
    const isInput =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.contentEditable === "true";

    for (const binding of this.bindings) {
      const isMatch =
        event.key.toLowerCase() === binding.key.toLowerCase() &&
        event.ctrlKey === (binding.ctrl ?? false) &&
        event.shiftKey === (binding.shift ?? false) &&
        event.altKey === (binding.alt ?? false);

      if (isMatch) {
        // Allow input fields for certain keys
        if (isInput && binding.key !== "Escape" && binding.key !== "Enter") {
          continue;
        }

        event.preventDefault();
        binding.handler(event);
      }
    }
  };
}

// Singleton instance
export const keyboardManager = new KeyboardManager();

/**
 * Helper to register Ctrl+Z / Cmd+Z
 */
export function registerUndoShortcut(handler: () => void) {
  keyboardManager.register({
    key: "z",
    ctrl: true,
    handler: () => handler(),
  });
}

/**
 * Helper to register Ctrl+Shift+Z / Cmd+Shift+Z
 */
export function registerRedoShortcut(handler: () => void) {
  keyboardManager.register({
    key: "z",
    ctrl: true,
    shift: true,
    handler: () => handler(),
  });
}

/**
 * Helper to register Delete key
 */
export function registerDeleteShortcut(handler: () => void) {
  keyboardManager.register({
    key: "Delete",
    handler: () => handler(),
  });
}

/**
 * Helper to register Escape key
 */
export function registerEscapeShortcut(handler: () => void) {
  keyboardManager.register({
    key: "Escape",
    handler: () => handler(),
  });
}

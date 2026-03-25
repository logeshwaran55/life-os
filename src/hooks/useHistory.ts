/**
 * React hook for managing undo/redo history
 */

import { useCallback, useRef, useState } from "react";
import { HistoryManager } from "../utils/history";

export type UseHistoryState<T> = {
  state: T;
  setState: (newState: T, description?: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

/**
 * Hook that wraps state management with undo/redo capability
 */
export function useHistory<T>(initialState: T): UseHistoryState<T> {
  const historyRef = useRef(new HistoryManager(initialState));
  const [state, setStateInternal] = useState<T>(initialState);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateHistoryUI = useCallback(() => {
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  }, []);

  const setState = useCallback(
    (newState: T, description = "State change") => {
      setStateInternal(newState);
      historyRef.current.push(newState, description);
      updateHistoryUI();
    },
    [updateHistoryUI]
  );

  const undo = useCallback(() => {
    const snapshot = historyRef.current.undo();
    if (snapshot) {
      setStateInternal(snapshot.state);
      updateHistoryUI();
    }
  }, [updateHistoryUI]);

  const redo = useCallback(() => {
    const snapshot = historyRef.current.redo();
    if (snapshot) {
      setStateInternal(snapshot.state);
      updateHistoryUI();
    }
  }, [updateHistoryUI]);

  return { state, setState, undo, redo, canUndo, canRedo };
}

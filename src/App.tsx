import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { AssistantMessage } from "./components/AssistantPanel";
import LoadingState from "./components/LoadingState";
import { calculateTrackingMetrics } from "./utils/metrics";
import { generateSmartEngine } from "./utils/smartEngine";
import { normalizePriority } from "./utils/rules";
import { analyzeUserBehavior, generateAdaptiveIntelligence } from "./utils/adaptiveEngine";
import { generateAdaptiveSchedule } from "./utils/adaptiveScheduleEngine";
import { runSystem } from "./utils/orchestrator";
import { validateTask } from "./utils/validator";
import { createEvent } from "./utils/events";
import { getSystemState } from "./utils/systemState";
import { getNextAction } from "./utils/decisionEngine";
import { getTodayTasks } from "./utils/timeUtils";
import type { ParsedIntent } from "./utils/intentParser";
import { handleUserCommand } from "./utils/assistant";
import { HistoryManager } from "./utils/history";
import { registerUndoShortcut, registerRedoShortcut, registerDeleteShortcut } from "./utils/keyboard";
import {
  createSchedule as createScheduleApi,
  createColumn as createColumnApi,
  createTask as createTaskApi,
  deleteSchedule as deleteScheduleApi,
  deleteColumn as deleteColumnApi,
  deleteTask as deleteTaskApi,
  fetchUserProfile,
  fetchSchedules,
  fetchColumns,
  fetchTasks,
  setUnauthorizedHandler,
  type UserProfile,
  updateSchedule as updateScheduleApi,
  updateColumn as updateColumnApi,
  updateTask as updateTaskApi,
} from "./services/api";
import {
  clearAuthSession,
  readAuthenticatedUser,
  readAuthToken,
  readThemePreference,
  writeAuthenticatedUser,
  writeAuthToken,
  writeThemePreference,
  type AuthUser,
} from "./services/storage";
import type { CellValue, Column, ColumnType, Task } from "./types/column";
import type { Schedule } from "./types/schedule";
import {
  DEFAULT_COLUMNS,
  createColumnId,
  getDefaultValueForColumn,
} from "./types/column";
import {
  deleteColumn as deleteColumnInState,
  moveColumn as moveColumnInState,
  parseSelectOptions,
  removeColumnFromTasks,
  renameColumn as renameColumnInState,
  updateSelectOptions,
} from "./utils/columnManager";
import DashboardPage from "./pages/Dashboard";
import TasksPage from "./pages/TasksPage";
import SchedulePage from "./pages/SchedulePage";
import SmartViewPage from "./pages/SmartView";
import AssistantPage from "./pages/AssistantPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import ProgressPage from "./pages/ProgressPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import "./App.css";

type ViewMode =
  | "dashboard"
  | "list"
  | "table"
  | "schedule"
  | "calendar"
  | "smart"
  | "assistant";
type ThemeMode = "light" | "dark";
type FeedbackTone = "success" | "error" | "info";
type ActivePage =
  | "dashboard"
  | "progress"
  | "tasks"
  | "schedule"
  | "smart"
  | "assistant"
  | "profile"
  | "settings";

const PAGE_PATHS: Record<ActivePage, string> = {
  dashboard: "/dashboard",
  progress: "/progress",
  tasks: "/tasks",
  schedule: "/schedule",
  smart: "/smart",
  assistant: "/assistant",
  profile: "/profile",
  settings: "/settings",
};

const PATH_PAGES = new Map<string, ActivePage>(
  Object.entries(PAGE_PATHS).map(([page, path]) => [path, page as ActivePage])
);

const AUTH_PATHS = new Set(["/login", "/signup", "/oauth-success"]);

const resolvePageFromPath = (pathname: string): ActivePage | null => {
  if (pathname === "/calendar") {
    return "schedule";
  }

  return PATH_PAGES.get(pathname) ?? null;
};

const resolveAuthScreenFromPath = (pathname: string): "login" | "signup" => {
  return pathname === "/signup" ? "signup" : "login";
};

/**
 * Ensure every task has a value for every active column.
 */
const hydrateTasksWithColumns = (currentTasks: Task[], currentColumns: Column[]): Task[] => {
  return currentTasks.map((task) => {
    const nextValues: Record<string, CellValue> = { ...task.values };

    currentColumns.forEach((column) => {
      if (!(column.id in nextValues)) {
        nextValues[column.id] = getDefaultValueForColumn(column.type);
      }
    });

    return {
      ...task,
      values: nextValues,
      createdAt: task.createdAt ?? new Date().toISOString(),
      completedAt: task.completedAt ?? null,
    };
  });
};

const valueAsString = (value: CellValue): string => {
  return typeof value === "string" ? value : value == null ? "" : String(value);
};

const STREAK_STORAGE_KEY = "lifeos-best-streak";

const getGreeting = (date = new Date()): string => {
  const hour = date.getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
};

function App() {
  // Column system state
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState<ColumnType>("text");
  const [newColumnSelectOptions, setNewColumnSelectOptions] = useState("");
  const [columnBuilderError, setColumnBuilderError] = useState("");

  // Task input fields
  const [taskName, setTaskName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">(
    "medium"
  );

  // App state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [filter, setFilter] = useState<"all" | "completed" | "pending">("all");
  const [sortBy, setSortBy] = useState<"none" | "priority" | "dueDate">("none");
  const [activePage, setActivePage] = useState<ActivePage>(() => {
    return resolvePageFromPath(window.location.pathname) ?? "dashboard";
  });
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);
  const [bestStreak, setBestStreak] = useState<number>(() => {
    const raw = window.localStorage.getItem(STREAK_STORAGE_KEY);
    const parsed = Number(raw ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  });
  
  // Undo/Redo history state
  const historyRef = useRef(new HistoryManager<Task[]>([]));
  const [selectedTableRows, setSelectedTableRows] = useState<string[]>([]);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      text:
        "I am here to help you stay on track. Try: plan my day, what should I do next, show progress, or add task Prepare weekly review.",
    },
  ]);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return readThemePreference();
  });
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => readAuthenticatedUser());
  const [authToken, setAuthToken] = useState<string | null>(() => readAuthToken());
  const [authScreen, setAuthScreen] = useState<"login" | "signup">(() => {
    return resolveAuthScreenFromPath(window.location.pathname);
  });
  const [isRestoringSession, setIsRestoringSession] = useState<boolean>(() => {
    return Boolean(readAuthToken() && !readAuthenticatedUser());
  });

  const mapViewModeToPage = useCallback((mode: ViewMode): ActivePage => {
    if (mode === "dashboard") return "dashboard";
    if (mode === "assistant") return "assistant";
    if (mode === "schedule") return "schedule";
    if (mode === "calendar") return "schedule";
    if (mode === "smart") return "smart";
    return "tasks";
  }, []);

  const showFeedback = useCallback((tone: FeedbackTone, message: string) => {
    setFeedback({ tone, message });
  }, []);

  useEffect(() => {
    console.log("[ScheduleSystem] schedules updated", schedules);
  }, [schedules]);

  const openAuthScreen = useCallback((screen: "login" | "signup") => {
    setAuthScreen(screen);
    const targetPath = screen === "signup" ? "/signup" : "/login";
    if (window.location.pathname !== targetPath) {
      window.history.replaceState({}, "", targetPath);
    }
  }, []);

  const openPage = useCallback((page: ActivePage) => {
    setActivePage(page);
  }, []);

  const syncWithApi = useCallback(<T,>(
    promise: Promise<T>,
    options?: { successMessage?: string; errorMessage?: string }
  ) => {
    void promise
      .then(() => {
        if (options?.successMessage) {
          showFeedback("success", options.successMessage);
        }
      })
      .catch((error) => {
        console.error(options?.errorMessage ?? "API sync failed", error);
        showFeedback("error", options?.errorMessage ?? "We could not save that yet. Please try again.");
      });
  }, [showFeedback]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => {
      setFeedback(null);
    }, 2600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [feedback]);

  useEffect(() => {
    if (window.location.pathname !== "/oauth-success") {
      return;
    }

    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      showFeedback("error", "Google sign-in did not complete. Please try again.");
      openAuthScreen("login");
      return;
    }

    let active = true;

    const completeGoogleLogin = async () => {
      try {
        writeAuthToken(token, true);
        setAuthToken(token);

        const profile = await fetchUserProfile();
        if (!active) {
          return;
        }

        const user: AuthUser = {
          id: profile.id,
          email: profile.email,
          name: profile.name ?? "",
          phone: profile.phone ?? "",
          avatar: profile.avatar ?? "",
          createdAt: profile.createdAt,
        };

        writeAuthenticatedUser(user);
        setAuthUser(user);
        setActivePage("dashboard");
        setFeedback(null);
        window.history.replaceState({}, "", PAGE_PATHS.dashboard);
        showFeedback("success", "Welcome back. You are signed in with Google.");
      } catch (_error) {
        clearAuthSession();
        if (!active) {
          return;
        }

        setAuthUser(null);
        setAuthToken(null);
        openAuthScreen("login");
        showFeedback("error", "Google sign-in did not go through. Please try again.");
      }
    };

    void completeGoogleLogin();

    return () => {
      active = false;
    };
  }, [openAuthScreen, showFeedback]);

  useEffect(() => {
    const path = window.location.pathname;

    if (!authToken || !authUser) {
      const desiredAuthScreen = resolveAuthScreenFromPath(path);
      if (authScreen !== desiredAuthScreen) {
        setAuthScreen(desiredAuthScreen);
      }

      if (!AUTH_PATHS.has(path)) {
        window.history.replaceState({}, "", "/login");
      }
      return;
    }

    const normalizedPath = PAGE_PATHS[activePage];
    if (path !== normalizedPath) {
      window.history.replaceState({}, "", normalizedPath);
    }
  }, [activePage, authScreen, authToken, authUser]);

  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname;

      if (!authToken || !authUser) {
        setAuthScreen(resolveAuthScreenFromPath(path));
        return;
      }

      const routePage = resolvePageFromPath(path);
      if (routePage) {
        setActivePage(routePage);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [authToken, authUser]);

  // Setup keyboard shortcuts
  useEffect(() => {
    const handleUndo = () => {
      const snapshot = historyRef.current.undo();
      if (snapshot) {
        setTasks(snapshot.state);
        showFeedback("info", "Undid: " + snapshot.description);
      }
    };

    const handleRedo = () => {
      const snapshot = historyRef.current.redo();
      if (snapshot) {
        setTasks(snapshot.state);
        showFeedback("info", "Redid: " + snapshot.description);
      }
    };

    const handleDeleteSelected = () => {
      if (selectedTableRows.length > 0) {
        deleteRows(selectedTableRows);
      }
    };

    registerUndoShortcut(handleUndo);
    registerRedoShortcut(handleRedo);
    registerDeleteShortcut(handleDeleteSelected);

    return () => {
      // Note: keyboard manager is global, just log for clarity
    };
  }, [selectedTableRows, showFeedback]);

  // Track selected table rows
  useEffect(() => {
    const tasks_set = new Set(tasks.map((t) => t.id));
    setSelectedTableRows((prev) => prev.filter((id) => tasks_set.has(id)));
  }, [tasks]);

  // Load tasks and columns from backend API
  useEffect(() => {
    let active = true;

    if (!authToken) {
      setIsLoadingData(false);
      setTasks([]);
      setSchedules([]);
      setColumns(DEFAULT_COLUMNS);
      return () => {
        active = false;
      };
    }

    setIsLoadingData(true);

    const loadInitialData = async () => {
      try {
        const [remoteColumns, remoteTasks, remoteSchedules] = await Promise.all([
          fetchColumns(),
          fetchTasks(),
          fetchSchedules(),
        ]);

        const resolvedColumns = remoteColumns.length > 0 ? remoteColumns : DEFAULT_COLUMNS;

        if (remoteColumns.length === 0) {
          await Promise.all(
            DEFAULT_COLUMNS.map((column) =>
              createColumnApi(column).catch((error) => {
                console.error("Failed to seed default column", error);
              })
            )
          );
        }

        if (!active) {
          return;
        }

        const hydratedTasks = hydrateTasksWithColumns(remoteTasks, resolvedColumns);
        setColumns(resolvedColumns);
        setTasks(hydratedTasks);
        setSchedules(remoteSchedules);
        historyRef.current = new HistoryManager(hydratedTasks);
        showFeedback("success", "All set. Your workspace is up to date.");
      } catch (e) {
        console.error("Failed to load data from API:", e);
        if (!active) {
          return;
        }
        setColumns(DEFAULT_COLUMNS);
        setTasks([]);
        setSchedules([]);
        showFeedback("error", "We could not reach the server, so we opened a fresh workspace for now.");
      } finally {
        if (active) {
          setIsLoadingData(false);
        }
      }
    };

    void loadInitialData();

    return () => {
      active = false;
    };
  }, [authToken]);

  useEffect(() => {
    setTasks((prev) => hydrateTasksWithColumns(prev, columns));
  }, [columns]);

  // Persist theme preference through storage service
  useEffect(() => {
    writeThemePreference(theme);
  }, [theme]);

  /**
   * Generate unique ID
   */
  const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const createEmptyRow = (): Task => {
    const values: Record<string, CellValue> = {};
    columns.forEach((column) => {
      values[column.id] = getDefaultValueForColumn(column.type);
    });

    return {
      id: generateId(),
      values,
      createdAt: new Date().toISOString(),
      completed: false,
      completedAt: null,
    };
  };

  /**
   * Add a new user-defined column and hydrate all tasks with a default value.
   */
  const addColumn = () => {
    const trimmedName = newColumnName.trim();
    if (!trimmedName) {
      setColumnBuilderError("Please add a column name first.");
      return;
    }

    const normalizedOptions = parseSelectOptions(newColumnSelectOptions);

    if (newColumnType === "select" && normalizedOptions.length === 0) {
      setColumnBuilderError("Please add at least one option for this select column.");
      return;
    }

    const baseId = createColumnId(trimmedName);
    const existingIds = new Set(columns.map((column) => column.id));
    let uniqueId = baseId;
    let suffix = 1;
    while (existingIds.has(uniqueId)) {
      uniqueId = `${baseId}-${suffix}`;
      suffix += 1;
    }

    const nextColumn: Column = {
      id: uniqueId,
      name: trimmedName,
      type: newColumnType,
      options: newColumnType === "select" ? normalizedOptions : undefined,
    };

    const nextColumns = [...columns, nextColumn];
    setColumns(nextColumns);
    syncWithApi(createColumnApi(nextColumn), {
      errorMessage: "We could not save that column yet. Please try again.",
    });

    const hydratedTasks = tasks.map((task) => ({
      ...task,
      values: {
        ...task.values,
        [nextColumn.id]: getDefaultValueForColumn(nextColumn.type),
      },
    }));
    setTasks(hydratedTasks);
    hydratedTasks.forEach((task) => {
      syncWithApi(updateTaskApi(task.id, task), {
        errorMessage: "We added the column, but could not refresh task values yet.",
      });
    });

    setNewColumnName("");
    setNewColumnType("text");
    setNewColumnSelectOptions("");
    setColumnBuilderError("");
    setIsAddingColumn(false);
  };

  const renameColumn = (columnId: string) => {
    const targetColumn = columns.find((column) => column.id === columnId);
    if (!targetColumn) return;

    const nextName = window.prompt("Rename this column", targetColumn.name);
    if (!nextName) return;

    const trimmed = nextName.trim();
    if (!trimmed) return;

    const nextColumns = renameColumnInState(columns, columnId, trimmed);
    setColumns(nextColumns);

    const updatedColumn = nextColumns.find((column) => column.id === columnId);
    if (updatedColumn) {
      syncWithApi(updateColumnApi(columnId, updatedColumn), {
        successMessage: "Nice. Column name updated.",
        errorMessage: "We could not rename that column yet. Please try again.",
      });
    }
  };

  const deleteColumn = (columnId: string) => {
    if (columns.length <= 1) return;

    const targetColumn = columns.find((column) => column.id === columnId);
    if (!targetColumn) return;

    const confirmed = window.confirm(
      `Delete \"${targetColumn.name}\"? This will remove that field from every task.`
    );
    if (!confirmed) return;

    const nextColumns = deleteColumnInState(columns, columnId);
    setColumns(nextColumns);
    const nextTasks = removeColumnFromTasks(tasks, columnId);
    setTasks(nextTasks);
    nextTasks.forEach((task) => {
      syncWithApi(updateTaskApi(task.id, task), {
        errorMessage: "Column removed, but we could not sync every task value yet.",
      });
    });

    syncWithApi(deleteColumnApi(columnId), {
      successMessage: "Column removed.",
      errorMessage: "We could not delete that column yet. Please try again.",
    });
  };

  const moveColumn = (columnId: string, direction: "left" | "right") => {
    setColumns((prev) => moveColumnInState(prev, columnId, direction));
  };

  const editSelectColumnOptions = (columnId: string) => {
    const column = columns.find((item) => item.id === columnId);
    if (!column || column.type !== "select") return;

    const current = (column.options ?? []).join(", ");
    const input = window.prompt(
      "Update options (comma separated)",
      current || "Option A, Option B"
    );

    if (input === null) return;

    const nextOptions = parseSelectOptions(input);
    if (nextOptions.length === 0) {
      window.alert("Please include at least one option before saving.");
      return;
    }

    const nextColumns = updateSelectOptions(columns, columnId, nextOptions);
    setColumns(nextColumns);

    const updatedColumn = nextColumns.find((column) => column.id === columnId);
    if (updatedColumn) {
      syncWithApi(updateColumnApi(columnId, updatedColumn), {
        successMessage: "Great. Column options updated.",
        errorMessage: "We could not update those options yet. Please try again.",
      });
    }
    const allowedValues = new Set(nextOptions);

    const nextTasks = tasks.map((task) => {
        const currentValue = task.values[columnId];
        if (typeof currentValue !== "string" || allowedValues.has(currentValue)) {
          return task;
        }

        return {
          ...task,
          values: {
            ...task.values,
            [columnId]: "",
          },
        };
      });

    setTasks(nextTasks);
    nextTasks.forEach((task) => {
      syncWithApi(updateTaskApi(task.id, task), {
        errorMessage: "Options changed, but we could not sync every task value yet.",
      });
    });
  };

  /**
   * Wrapper for setTasks that also records history
   */
  const setTasksWithHistory = useCallback((newTasks: Task[], description: string) => {
    setTasks(newTasks);
    historyRef.current.push(newTasks, description);
  }, []);

  /**
   * Add a new task with default values
   */
  const addTask = () => {
    if (taskName.trim() === "") {
      showFeedback("info", "Add a task name to get started.");
      return;
    }

    const newTask = createEmptyRow();
    newTask.values.name = taskName;
    newTask.values.dueDate = dueDate;
    newTask.values.priority = priority;

    const validation = validateTask(newTask, columns);
    const sanitizedTask = validation.task;
    if (validation.errors.length > 0) {
      showFeedback("info", validation.errors[0].message);
    }

    const nextTasks = [...tasks, sanitizedTask];
    setTasksWithHistory(nextTasks, `Added task: ${taskName || "Untitled"}`);
    syncWithApi(createTaskApi(sanitizedTask), {
      successMessage: "Nice start. Task added.",
      errorMessage: "We could not add that task yet. Please try again.",
    });
    createEvent("task_created", sanitizedTask.id);
    setTaskName("");
    setDueDate("");
    setPriority("medium");
  };

  const addRow = () => {
    const newRow = createEmptyRow();
    const validation = validateTask(newRow, columns);
    const sanitizedRow = validation.task;
    if (validation.errors.length > 0) {
      showFeedback("info", validation.errors[0].message);
    }

    const nextTasks = [...tasks, sanitizedRow];
    setTasksWithHistory(nextTasks, "Added empty row");
    syncWithApi(createTaskApi(sanitizedRow), {
      successMessage: "Row added.",
      errorMessage: "We could not add that row yet. Please try again.",
    });
    createEvent("task_created", sanitizedRow.id);
  };

  /**
   * Toggle task completion
   */
  const toggleComplete = (id: string) => {
    const updatedTasks = tasks.map((task) =>
      task.id === id
        ? {
            ...task,
            completed: !task.completed,
            completedAt: !task.completed ? new Date().toISOString() : null,
          }
        : task
    );
    const taskName = valueAsString(tasks.find((t) => t.id === id)?.values.name ?? "") || "Task";
    setTasksWithHistory(updatedTasks, `Toggled: ${taskName}`);

    const targetTask = updatedTasks.find((task) => task.id === id);
    if (targetTask) {
      syncWithApi(updateTaskApi(id, targetTask), {
        successMessage: targetTask.completed ? "Great work. Task marked complete." : "Task reopened and back in play.",
        errorMessage: "We could not update task status yet. Please try again.",
      });
      createEvent(targetTask.completed ? "task_completed" : "task_updated", id);
    }
  };

  /**
   * Delete a task
   */
  const deleteTask = (id: string) => {
    const targetTask = tasks.find((task) => task.id === id);
    const taskLabel = targetTask
      ? valueAsString(targetTask.values.name) || "this task"
      : "this task";
    const confirmed = window.confirm(`Delete ${taskLabel}? You can always add it again later.`);
    if (!confirmed) return;

    const updatedTasks = tasks.filter((task) => task.id !== id);
    setTasksWithHistory(updatedTasks, `Deleted: ${taskLabel}`);
    setSelectedTableRows((prev) => prev.filter((rid) => rid !== id));
    createEvent("task_deleted", id);

    syncWithApi(deleteTaskApi(id), {
      successMessage: "Task removed.",
      errorMessage: "We could not delete that task yet. Please try again.",
    });
  };

  const deleteRows = (rowIds: string[]) => {
    if (rowIds.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${rowIds.length} selected row${rowIds.length === 1 ? "" : "s"}? This action cannot be undone.`
    );
    if (!confirmed) return;

    const nextTasks = tasks.filter((row) => !rowIds.includes(row.id));
    setTasksWithHistory(nextTasks, `Deleted ${rowIds.length} row${rowIds.length === 1 ? "" : "s"}`);
    setSelectedTableRows([]);

    rowIds.forEach((rowId) => {
      createEvent("task_deleted", rowId);
      syncWithApi(deleteTaskApi(rowId), {
        errorMessage: "We could not delete one of the selected rows.",
      });
    });
  };

  const duplicateRows = (rowIds: string[]) => {
    if (rowIds.length === 0) return;

    const clones = tasks
      .filter((row) => rowIds.includes(row.id))
      .map((row) => {
        const clonedTask: Task = {
          ...row,
          id: generateId(),
          values: { ...row.values },
          createdAt: new Date().toISOString(),
          completed: false,
          completedAt: null,
        };

        return validateTask(clonedTask, columns).task;
      });

    if (clones.length > 0) {
      const nextTasks = [...tasks, ...clones];
      setTasksWithHistory(nextTasks, `Duplicated ${clones.length} row${clones.length === 1 ? "" : "s"}`);
      clones.forEach((clone) => {
        syncWithApi(createTaskApi(clone), {
          errorMessage: "We could not duplicate one of those rows.",
        });
        createEvent("task_created", clone.id);
      });
    }
  };

  /**
   * Bulk mark selected rows as complete
   */
  const bulkCompleteRows = (rowIds: string[]) => {
    if (rowIds.length === 0) return;

    const nextTasks = tasks.map((task) =>
      rowIds.includes(task.id)
        ? {
            ...task,
            completed: true,
            completedAt: new Date().toISOString(),
          }
        : task
    );

    setTasksWithHistory(nextTasks, `Completed ${rowIds.length} row${rowIds.length === 1 ? "" : "s"}`);
    setSelectedTableRows([]);

    rowIds.forEach((rowId) => {
      const taskToUpdate = nextTasks.find((t) => t.id === rowId);
      if (taskToUpdate) {
        syncWithApi(updateTaskApi(rowId, taskToUpdate), {
          errorMessage: "We could not mark one task as complete yet.",
        });
        createEvent("task_completed", rowId);
      }
    });
  };

  /**
   * Update a cell value
   * taskId: ID of the task
   * columnId: ID of the column being edited
   * newValue: New value for that column
   */
  const updateTask = (taskId: string, columnId: string, newValue: CellValue) => {
    const updatedTasks = tasks.map((task) => {
      if (task.id !== taskId) {
        return task;
      }

      const candidateTask: Task = {
        ...task,
        values: {
          ...task.values,
          [columnId]: newValue,
        },
      };

      return validateTask(candidateTask, columns).task;
    });
    setTasksWithHistory(updatedTasks, "Updated task");

    const targetTask = updatedTasks.find((task) => task.id === taskId);
    if (targetTask) {
      syncWithApi(updateTaskApi(taskId, targetTask), {
        errorMessage: "We could not save that edit yet. Please try again.",
      });
      createEvent("task_updated", taskId);
    }
  };

  const isTasksNavActive = activePage === "tasks";
  const navOrder: ActivePage[] = [
    "dashboard",
    "progress",
    "tasks",
    "schedule",
    "smart",
    "assistant",
    "profile",
    "settings",
  ];
  const activeNavIndex = Math.max(0, navOrder.indexOf(activePage));
  const trackingMetrics = useMemo(
    () => calculateTrackingMetrics(tasks, columns),
    [tasks, columns]
  );

  const intelligenceDateColumnId = useMemo(() => {
    const explicitDueDate = columns.find((column) => column.id === "dueDate");
    if (explicitDueDate) return explicitDueDate.id;

    const firstDateColumn = columns.find((column) => column.type === "date");
    return firstDateColumn ? firstDateColumn.id : "dueDate";
  }, [columns]);

  const smartEngine = useMemo(
    () => generateSmartEngine(tasks, intelligenceDateColumnId),
    [tasks, intelligenceDateColumnId]
  );

  const todayTasks = useMemo(
    () => getTodayTasks(tasks, intelligenceDateColumnId).filter((task) => !task.completed),
    [tasks, intelligenceDateColumnId]
  );

  const adaptiveIntelligence = useMemo(
    () => generateAdaptiveIntelligence(tasks, intelligenceDateColumnId),
    [tasks, intelligenceDateColumnId]
  );

  const behavior = useMemo(() => analyzeUserBehavior(tasks), [tasks]);

  const systemState = useMemo(
    () => getSystemState(tasks, behavior, intelligenceDateColumnId),
    [tasks, behavior, intelligenceDateColumnId]
  );

  const nextAction = useMemo(
    () => getNextAction(tasks, systemState, behavior, intelligenceDateColumnId),
    [tasks, systemState, behavior, intelligenceDateColumnId]
  );

  const orchestrator = useMemo(
    () => runSystem(tasks, intelligenceDateColumnId),
    [tasks, intelligenceDateColumnId]
  );

  useEffect(() => {
    const currentStreak = smartEngine.streak.current;
    if (currentStreak > bestStreak) {
      setBestStreak(currentStreak);
      window.localStorage.setItem(STREAK_STORAGE_KEY, String(currentStreak));
    }
  }, [bestStreak, smartEngine.streak.current]);

  const filteredTasks = tasks.filter((task) => {
    if (filter === "completed") return task.completed;
    if (filter === "pending") return !task.completed;
    return true;
  });

  const sortedAndFilteredTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "priority") {
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const aPriority = smartEngine.effectivePriorityByTaskId[a.id] ?? normalizePriority(a.values.priority);
      const bPriority = smartEngine.effectivePriorityByTaskId[b.id] ?? normalizePriority(b.values.priority);
      return (
        (priorityOrder[aPriority] ?? 1) -
        (priorityOrder[bPriority] ?? 1)
      );
    }
    if (sortBy === "dueDate") {
      const aDueDate = valueAsString(a.values.dueDate);
      const bDueDate = valueAsString(b.values.dueDate);
      return (
        new Date(aDueDate || "").getTime() -
        new Date(bDueDate || "").getTime()
      );
    }
    return 0;
  });

  const adaptiveSchedule = useMemo(
    () => generateAdaptiveSchedule(tasks, intelligenceDateColumnId),
    [tasks, intelligenceDateColumnId]
  );

  const displayedTasks = useMemo(() => {
    if (!isFocusMode) {
      return sortedAndFilteredTasks;
    }

    const focusSet = new Set(smartEngine.focusTaskIds);
    return sortedAndFilteredTasks.filter((task) => focusSet.has(task.id));
  }, [isFocusMode, smartEngine.focusTaskIds, sortedAndFilteredTasks]);

  const legacyTasks = useMemo(
    () =>
      displayedTasks.map((t) => ({
        id: t.id,
        text: valueAsString(t.values.name),
        completed: t.completed,
        dueDate: valueAsString(t.values.dueDate),
        priority: smartEngine.effectivePriorityByTaskId[t.id] ?? normalizePriority(t.values.priority),
      })),
    [displayedTasks, smartEngine.effectivePriorityByTaskId]
  );

  const focusTasks = useMemo(
    () => tasks.filter((task) => smartEngine.focusTaskIds.includes(task.id) && !task.completed),
    [tasks, smartEngine.focusTaskIds]
  );

  const displayName = useMemo(() => {
    const trimmedName = authUser?.name?.trim();
    if (trimmedName) {
      return trimmedName;
    }

    const emailName = authUser?.email?.split("@")[0]?.trim();
    return emailName || "there";
  }, [authUser?.email, authUser?.name]);

  const greeting = useMemo(() => {
    return `${getGreeting()}, ${displayName}`;
  }, [displayName]);

  const pendingTasksCount = trackingMetrics.core.pendingTasks;
  const completionPercentage = trackingMetrics.core.completionPercentage;
  const productivityScore = useMemo(() => {
    const baseScore = completionPercentage;
    const overduePenalty = trackingMetrics.time.overdueTasks * 5;
    const streakBonus = Math.min(20, trackingMetrics.behavior.currentStreak * 2);
    const raw = baseScore - overduePenalty + streakBonus;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }, [
    completionPercentage,
    trackingMetrics.behavior.currentStreak,
    trackingMetrics.time.overdueTasks,
  ]);
  const weeklyCompleted = useMemo(() => {
    return trackingMetrics.behavior.last7DaysTrend.reduce((sum, point) => sum + point.count, 0);
  }, [trackingMetrics.behavior.last7DaysTrend]);
  const weeklyProgressText = `${weeklyCompleted} task${weeklyCompleted === 1 ? "" : "s"} done`;
  const isNewUser = tasks.length === 0;
  const needsNameSetup = !authUser?.name?.trim();

  const heroMessage = useMemo(() => {
    const pendingWord = pendingTasksCount === 1 ? "task" : "tasks";
    const todayLine =
      pendingTasksCount === 0
        ? "You are all caught up."
        : `You have ${pendingTasksCount} pending ${pendingWord}.`;
    const modeLine =
      pendingTasksCount === 0
        ? "Start by adding your first task to build momentum."
        : pendingTasksCount >= 10
          ? "You have a heavy queue right now. Reduce scope and finish one important task first."
          : completionPercentage >= 60
            ? "Great progress so far. Keep the pace and close your next task."
            : isFocusMode || systemState === "focus"
              ? "You're in focus mode. Protect your deep work blocks."
              : "You're building momentum. Keep moving with one clear next step.";

    return {
      todayLine,
      modeLine,
    };
  }, [completionPercentage, isFocusMode, pendingTasksCount, systemState]);

  const heroFriendlyMessage = useMemo(() => {
    if (pendingTasksCount === 0) {
      return "Start by adding your first task 🚀";
    }
    if (pendingTasksCount >= 10) {
      return "You have many pending tasks. Prioritize one high-impact task now.";
    }
    if (completionPercentage >= 60) {
      return "Good progress today. Keep the momentum going.";
    }
    if (systemState === "focus" || isFocusMode) {
      return "You're in focus mode. Keep distractions out and ship the next task.";
    }
    return "You are in a healthy flow. Keep moving with one clear next action.";
  }, [completionPercentage, isFocusMode, pendingTasksCount, systemState]);

  const actionCtaLabel = useMemo(
    () => (systemState === "focus" || isFocusMode ? "Start Focus Session" : "Continue Work"),
    [systemState, isFocusMode]
  );

  const actionGuidance = useMemo(() => {
    if (nextAction.nextBestTask) {
      return `Recommended now: ${nextAction.nextBestTask.title}`;
    }
    if (todayTasks.length === 0) {
      return "No tasks due today. Create one meaningful priority and begin.";
    }
    return "You already have momentum. Continue with your current plan.";
  }, [nextAction.nextBestTask, todayTasks.length]);

  const pageIdentity = useMemo(() => {
    if (activePage === "dashboard") {
      return {
        heading: "Overview and guidance",
        guidance: "See your system status, then execute the next best move.",
      };
    }

    if (activePage === "tasks") {
      return {
        heading: "Data editing workspace",
        guidance: "Capture details quickly, clean your data, and keep fields consistent.",
      };
    }

    if (activePage === "progress") {
      return {
        heading: "Performance analytics",
        guidance: "Track consistency, trends, and progress over time.",
      };
    }

    if (activePage === "schedule") {
      return {
        heading: "Unified scheduling system",
        guidance: "Plan and execute your day in one professional calendar timeline.",
      };
    }

    if (activePage === "smart") {
      return {
        heading: "Smart execution board",
        guidance: "Use intelligent priorities to finish high-impact work first.",
      };
    }

    if (activePage === "assistant") {
      return {
        heading: "Command center",
        guidance: "Use natural commands to apply changes faster.",
      };
    }

    if (activePage === "profile") {
      return {
        heading: "Your profile",
        guidance: "Manage your personal details and account identity.",
      };
    }

    if (activePage === "settings") {
      return {
        heading: "Workspace settings",
        guidance: "Tune preferences and account-level actions.",
      };
    }

    return {
      heading: "Task workspace",
      guidance: "Manage tasks with clear focus and flow.",
    };
  }, [activePage]);

  const reorderScheduledTask = useCallback((sourceTaskId: string, targetTaskId: string) => {
    const todayTaskIds = adaptiveSchedule.timeline
      .filter((entry) => entry.dayOffset === 0 && entry.kind === "task" && entry.taskId)
      .map((entry) => entry.taskId as string)
      .filter((id, index, arr) => arr.indexOf(id) === index);

    const sourceIndex = todayTaskIds.indexOf(sourceTaskId);
    const targetIndex = todayTaskIds.indexOf(targetTaskId);

    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
      return;
    }

    const reordered = [...todayTaskIds];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const rankByTaskId = new Map<string, number>();
    reordered.forEach((id, index) => {
      rankByTaskId.set(id, (index + 1) * 10);
    });

    const nextTasks = tasks.map((task) => {
      const nextRank = rankByTaskId.get(task.id);
      if (nextRank == null) {
        return task;
      }

      return {
        ...task,
        values: {
          ...task.values,
          scheduleRank: nextRank,
        },
      };
    });

    setTasks(nextTasks);
    nextTasks
      .filter((task) => rankByTaskId.has(task.id))
      .forEach((task) => {
        syncWithApi(updateTaskApi(task.id, task), {
          errorMessage: "We could not save that timeline move yet.",
        });
      });

    showFeedback("success", "Timeline updated.");
  }, [adaptiveSchedule.timeline, tasks, showFeedback, syncWithApi]);

  const handleAssistantSend = useCallback((input: string) => {
    const result = handleUserCommand(input, {
      tasks,
      columns,
      metrics: trackingMetrics,
      schedule: adaptiveSchedule,
      dateColumnId: intelligenceDateColumnId,
    });

    const messageIdBase = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setAssistantMessages((prev) => [
      ...prev,
      {
        id: `${messageIdBase}-user`,
        role: "user",
        text: input,
      },
      {
        id: `${messageIdBase}-assistant`,
        role: "assistant",
        text: result.message,
        kind:
          result.message.toLowerCase().includes("did not recognize")
            ? "warning"
            : result.changes.tasks || result.changes.viewMode || typeof result.changes.showSuggestions === "boolean"
              ? "action"
              : "normal",
        actions: [
          ...(result.changes.tasks ? ["Updated tasks"] : []),
          ...(result.changes.viewMode ? [`Switched to ${result.changes.viewMode}`] : []),
          ...(typeof result.changes.showSuggestions === "boolean"
            ? [result.changes.showSuggestions ? "Suggestions enabled" : "Suggestions hidden"]
            : []),
        ],
      },
    ]);

    if (result.changes.tasks) {
      const nextTasks = result.changes.tasks;
      setTasks(nextTasks);

      const currentById = new Map(tasks.map((task) => [task.id, task]));
      const nextById = new Map(nextTasks.map((task) => [task.id, task]));

      nextTasks.forEach((task) => {
        const existing = currentById.get(task.id);
        if (!existing) {
          syncWithApi(createTaskApi(task), {
            errorMessage: "Assistant created a task, but sync did not finish.",
          });
          return;
        }

        if (JSON.stringify(existing) !== JSON.stringify(task)) {
          syncWithApi(updateTaskApi(task.id, task), {
            errorMessage: "Assistant updated a task, but sync did not finish.",
          });
        }
      });

      tasks.forEach((task) => {
        if (!nextById.has(task.id)) {
          syncWithApi(deleteTaskApi(task.id), {
            errorMessage: "Assistant removed a task, but sync did not finish.",
          });
        }
      });

      showFeedback("success", "Done. I have applied those updates.");
    }

    if (result.changes.viewMode) {
      setActivePage(mapViewModeToPage(result.changes.viewMode));
    }

    if (typeof result.changes.showSuggestions === "boolean") {
      setShowSuggestions(result.changes.showSuggestions);
    }
  }, [
    adaptiveSchedule,
    columns,
    intelligenceDateColumnId,
    mapViewModeToPage,
    showFeedback,
    syncWithApi,
    tasks,
    trackingMetrics,
  ]);

  const handleParsedIntent = useCallback((parsed: ParsedIntent) => {
    if (parsed.action === "openSchedule") {
      setActivePage("schedule");
      showFeedback("info", "Opening your schedule now.");
      return;
    }

    if (parsed.action === "showNextAction") {
      setActivePage("dashboard");
      showFeedback("info", "Here is your next best action.");
      return;
    }

    if (parsed.action === "openDashboard") {
      setActivePage("dashboard");
      showFeedback("info", "Taking you back to your dashboard.");
      return;
    }

    if (parsed.action === "enableFocusMode") {
      setIsFocusMode(true);
      setActivePage("tasks");
      showFeedback("info", "Focus mode is on. Let us tackle one thing at a time.");
      return;
    }

    showFeedback("info", "Try a request like 'plan my day' or 'what should I do next'.");
  }, [showFeedback]);

  const handlePrimaryAction = useCallback(() => {
    if (systemState === "focus" || isFocusMode) {
      setIsFocusMode(true);
      openPage("tasks");
      showFeedback("success", "Focus session started. Keep attention on your highest-impact task.");
      return;
    }

    openPage("schedule");
    showFeedback("info", "Opening your timeline so you can continue where you left off.");
  }, [isFocusMode, openPage, showFeedback, systemState]);

  const handleOpenFirstTaskSetup = useCallback(() => {
    openPage("tasks");
    showFeedback("info", "Great place to start. Add your first task here.");
  }, [openPage, showFeedback]);

  const handleOpenNameSetup = useCallback(() => {
    openPage("profile");
    showFeedback("info", "Add your name in profile so your workspace feels personal.");
  }, [openPage, showFeedback]);

  const handleCreateSchedule = useCallback(async (payload: Omit<Schedule, "id">) => {
    const created = await createScheduleApi(payload);
    setSchedules((prev) => [...prev, created]);
    showFeedback("success", "Great. Your schedule is saved.");
  }, [showFeedback]);

  const handleUpdateSchedule = useCallback(async (
    scheduleId: string,
    updates: Partial<Omit<Schedule, "id">>
  ) => {
    const updated = await updateScheduleApi(scheduleId, updates);
    setSchedules((prev) => prev.map((item) => (item.id === scheduleId ? updated : item)));
    showFeedback("success", "Nice update. Your schedule is saved.");
  }, [showFeedback]);

  const handleDeleteSchedule = useCallback(async (scheduleId: string) => {
    await deleteScheduleApi(scheduleId);
    setSchedules((prev) => prev.filter((item) => item.id !== scheduleId));
    showFeedback("success", "Removed from your calendar.");
  }, [showFeedback]);

  const handleAuthenticated = useCallback((user: AuthUser, token: string, rememberMe: boolean) => {
    writeAuthenticatedUser(user);
    writeAuthToken(token, rememberMe);
    setAuthUser(user);
    setAuthToken(token);
    setIsRestoringSession(false);
    setActivePage("dashboard");
    window.history.replaceState({}, "", PAGE_PATHS.dashboard);
    setFeedback(null);
  }, []);

  const handleProfileUpdated = useCallback((profile: UserProfile) => {
    const nextUser: AuthUser = {
      id: profile.id,
      email: profile.email,
      name: profile.name ?? "",
      phone: profile.phone ?? "",
      avatar: profile.avatar ?? "",
      createdAt: profile.createdAt,
    };

    setAuthUser(nextUser);
    writeAuthenticatedUser(nextUser);
    showFeedback("success", "Profile updated. Nice and tidy.");
  }, [showFeedback]);

  const handleLogout = useCallback(() => {
    clearAuthSession();
    setAuthUser(null);
    setAuthToken(null);
    setIsRestoringSession(false);
    setTasks([]);
    setSchedules([]);
    setColumns(DEFAULT_COLUMNS);
    setAssistantMessages([
      {
        id: "assistant-welcome",
        role: "assistant",
        text:
          "I am here to help you stay on track. Try: plan my day, what should I do next, show progress, or add task Prepare weekly review.",
      },
    ]);
    openAuthScreen("login");
  }, [openAuthScreen]);

  useEffect(() => {
    if (!authToken || authUser) {
      setIsRestoringSession(false);
      return;
    }

    let active = true;
    setIsRestoringSession(true);

    const restoreUserSession = async () => {
      try {
        const profile = await fetchUserProfile();
        if (!active) {
          return;
        }

        const restoredUser: AuthUser = {
          id: profile.id,
          email: profile.email,
          name: profile.name ?? "",
          phone: profile.phone ?? "",
          avatar: profile.avatar ?? "",
          createdAt: profile.createdAt,
        };

        writeAuthenticatedUser(restoredUser);
        setAuthUser(restoredUser);
      } catch (_error) {
        if (!active) {
          return;
        }
        handleLogout();
      } finally {
        if (active) {
          setIsRestoringSession(false);
        }
      }
    };

    void restoreUserSession();

    return () => {
      active = false;
    };
  }, [authToken, authUser, handleLogout]);

  const handleResetData = useCallback(async () => {
    const confirmed = window.confirm("Reset your workspace? This will remove all tasks and custom columns.");
    if (!confirmed) {
      return;
    }

    try {
      const [currentTasks, currentColumns, currentSchedules] = await Promise.all([
        fetchTasks(),
        fetchColumns(),
        fetchSchedules(),
      ]);

      await Promise.all(currentTasks.map((task) => deleteTaskApi(task.id)));
      await Promise.all(currentColumns.map((column) => deleteColumnApi(column.id)));
      await Promise.all(currentSchedules.map((schedule) => deleteScheduleApi(schedule.id)));
      await Promise.all(DEFAULT_COLUMNS.map((column) => createColumnApi(column)));

      setColumns(DEFAULT_COLUMNS);
      setTasks([]);
      setSchedules([]);
      historyRef.current = new HistoryManager<Task[]>([]);
      setSelectedTableRows([]);
      showFeedback("success", "Workspace reset complete. You are ready for a fresh start.");
    } catch (error) {
      console.error("Failed to reset workspace", error);
      showFeedback("error", "We could not reset your workspace yet. Please try again.");
    }
  }, [showFeedback]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      handleLogout();
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [handleLogout]);

  if (isRestoringSession) {
    return (
      <div className={`app-shell theme-${theme}`}>
        <main className="main-content">
          <div className="card section-card">
            <LoadingState />
          </div>
        </main>
      </div>
    );
  }

  if (!authUser || !authToken) {
    if (authScreen === "signup") {
      return (
        <SignupPage
          onAuthenticated={handleAuthenticated}
          onToggleTheme={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
          theme={theme}
          onSwitchToLogin={() => openAuthScreen("login")}
        />
      );
    }

    return (
      <LoginPage
        onAuthenticated={handleAuthenticated}
        onToggleTheme={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
        theme={theme}
        onSwitchToSignup={() => openAuthScreen("signup")}
      />
    );
  }

  return (
    <div className={`app-shell theme-${theme}`}>
      <aside className="sidebar">
        <div>
          <div className="brand">🚀 LifeOS</div>
          <div className="brand-subtitle">Modern productivity workspace</div>
        </div>

        <nav
          className="nav-list"
          style={{ ["--active-nav-index" as string]: activeNavIndex }}
        >
          <button
            onClick={() => {
              setActivePage("dashboard");
            }}
            className={`nav-item ${activePage === "dashboard" ? "active" : ""}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => {
              setActivePage("progress");
            }}
            className={`nav-item ${activePage === "progress" ? "active" : ""}`}
          >
            Progress
          </button>
          <button
            onClick={() => {
              setActivePage("tasks");
            }}
            className={`nav-item ${isTasksNavActive ? "active" : ""}`}
          >
            Tasks
          </button>
          <button
            onClick={() => {
              setActivePage("schedule");
            }}
            className={`nav-item ${activePage === "schedule" ? "active" : ""}`}
          >
            Schedule
          </button>
          <button
            onClick={() => {
              setActivePage("smart");
            }}
            className={`nav-item ${activePage === "smart" ? "active" : ""}`}
          >
            Smart View
          </button>
          <button
            onClick={() => {
              setActivePage("assistant");
            }}
            className={`nav-item ${activePage === "assistant" ? "active" : ""}`}
          >
            Assistant
          </button>
          <button
            onClick={() => {
              setActivePage("profile");
            }}
            className={`nav-item ${activePage === "profile" ? "active" : ""}`}
          >
            Profile
          </button>
          <button
            onClick={() => {
              setActivePage("settings");
            }}
            className={`nav-item ${activePage === "settings" ? "active" : ""}`}
          >
            Settings
          </button>
        </nav>

      </aside>

      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="title">LifeOS Workspace</h1>
            <p className="subtitle">{pageIdentity.heading}. {pageIdentity.guidance}</p>
          </div>
          <div className="header-right">
            <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>
          </div>
        </div>

        <div className="app-toast-host" aria-live="polite" aria-atomic="true">
          {feedback && <div className={`feedback-banner ${feedback.tone}`}>{feedback.message}</div>}
        </div>

        <div key={isLoadingData ? "loading" : activePage} className="page-switch-stage">
          {isLoadingData ? (
            <div className="card section-card">
              <LoadingState />
            </div>
          ) : activePage === "dashboard" ? (
            <DashboardPage
            greeting={greeting}
            heroTodayLine={heroMessage.todayLine}
            heroFriendlyMessage={heroFriendlyMessage}
            productivityScore={productivityScore}
            weeklyProgressText={weeklyProgressText}
            showOnboarding={isNewUser || needsNameSetup}
            needsNameSetup={needsNameSetup}
            onStartFirstTask={handleOpenFirstTaskSetup}
            onSetName={handleOpenNameSetup}
            systemState={systemState}
            actionCtaLabel={actionCtaLabel}
            actionGuidance={actionGuidance}
            todayTasksCount={todayTasks.length}
            focusTasksCount={focusTasks.length}
            insightsCount={smartEngine.insights.length}
            onPrimaryAction={handlePrimaryAction}
            insights={smartEngine.insights}
            nextAction={nextAction}
            tasks={tasks}
            onParsedIntent={handleParsedIntent}
            focusTasks={focusTasks}
            isFocusMode={isFocusMode}
            onToggleFocusMode={() => setIsFocusMode((prev) => !prev)}
            onOpenTaskInTable={() => {
              openPage("tasks");
            }}
            orchestrator={orchestrator}
            displayedTasks={displayedTasks}
            intelligenceDateColumnId={intelligenceDateColumnId}
            onReorderScheduledTask={reorderScheduledTask}
            showSuggestions={showSuggestions}
            nextTask={smartEngine.nextTask}
            adaptiveIntelligence={adaptiveIntelligence}
            />
          ) : activePage === "progress" ? (
            <ProgressPage tasks={tasks} />
          ) : activePage === "tasks" ? (
            <TasksPage
            taskName={taskName}
            setTaskName={setTaskName}
            dueDate={dueDate}
            setDueDate={setDueDate}
            priority={priority}
            setPriority={setPriority}
            addTask={addTask}
            filter={filter}
            setFilter={setFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            isFocusMode={isFocusMode}
            onToggleFocusMode={() => setIsFocusMode((prev) => !prev)}
            showSuggestions={showSuggestions}
            onToggleSuggestions={() => setShowSuggestions((prev) => !prev)}
            smartInsightCount={smartEngine.insights.length}
            columns={columns}
            displayedTasks={displayedTasks}
            tasks={tasks}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onDuplicateRows={duplicateRows}
            onAddRow={addRow}
            onToggleComplete={toggleComplete}
            onDeleteRows={deleteRows}
            onBulkCompleteRows={bulkCompleteRows}
            onRenameColumn={renameColumn}
            onDeleteColumn={deleteColumn}
            onMoveColumn={moveColumn}
            onEditSelectOptions={editSelectColumnOptions}
            isAddingColumn={isAddingColumn}
            setIsAddingColumn={setIsAddingColumn}
            newColumnName={newColumnName}
            setNewColumnName={setNewColumnName}
            newColumnType={newColumnType}
            setNewColumnType={setNewColumnType}
            newColumnSelectOptions={newColumnSelectOptions}
            setNewColumnSelectOptions={setNewColumnSelectOptions}
            columnBuilderError={columnBuilderError}
            setColumnBuilderError={setColumnBuilderError}
            addColumn={addColumn}
            streakCurrent={smartEngine.streak.current}
            streakBest={Math.max(bestStreak, smartEngine.streak.bestInData)}
            tasksPerDay={smartEngine.workload.tasksPerDay}
            productivityLevel={adaptiveIntelligence.patterns.productivityLevel}
            />
          ) : activePage === "schedule" ? (
            <SchedulePage
            schedules={schedules}
            onCreateSchedule={handleCreateSchedule}
            onUpdateSchedule={handleUpdateSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            />
          ) : activePage === "smart" ? (
            <SmartViewPage
            legacyTasks={legacyTasks}
            insights={smartEngine.insights}
            nextTask={smartEngine.nextTask}
            adaptiveIntelligence={adaptiveIntelligence}
            onToggleComplete={toggleComplete}
            onDeleteTask={deleteTask}
            onUpdateTask={(id, updates) => {
              if (updates.text) updateTask(id, "name", updates.text);
              if (updates.dueDate) updateTask(id, "dueDate", updates.dueDate);
              if (updates.priority) updateTask(id, "priority", updates.priority);
            }}
            />
          ) : activePage === "profile" ? (
            <ProfilePage onProfileUpdated={handleProfileUpdated} />
          ) : activePage === "settings" ? (
            <SettingsPage
              theme={theme}
              onThemeChange={setTheme}
              onLogout={handleLogout}
              onAccountDeleted={handleLogout}
              onResetData={handleResetData}
            />
          ) : (
            <AssistantPage messages={assistantMessages} onSend={handleAssistantSend} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

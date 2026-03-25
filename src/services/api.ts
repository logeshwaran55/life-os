import type { Column, Task } from "../types/column";
import type { Schedule } from "../types/schedule";
import { readAuthToken } from "./storage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const DEV_API_FALLBACK_BASE = import.meta.env.VITE_DEV_API_FALLBACK ?? "http://localhost:5000/api";
const SHOULD_TRY_DEV_FALLBACK =
  import.meta.env.DEV && (API_BASE_URL.startsWith("/") || API_BASE_URL.startsWith("http://localhost"));

type RequestMethod = "GET" | "POST" | "PUT" | "DELETE";
type AuthResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    createdAt?: string;
  };
};

export type UserProfile = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  avatar?: string;
  createdAt?: string;
};

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
  unauthorizedHandler = handler;
};

const request = async <T>(
  path: string,
  method: RequestMethod,
  body?: unknown,
  options?: { includeAuth?: boolean }
): Promise<T> => {
  const includeAuth = options?.includeAuth ?? true;
  const token = includeAuth ? readAuthToken() : null;
  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  };

  const primaryUrl = `${API_BASE_URL}${path}`;

  let response: Response;

  try {
    response = await fetch(primaryUrl, requestInit);
  } catch (networkError) {
    if (!SHOULD_TRY_DEV_FALLBACK) {
      throw networkError;
    }

    response = await fetch(`${DEV_API_FALLBACK_BASE}${path}`, requestInit);
  }

  if (response.status === 404 && SHOULD_TRY_DEV_FALLBACK) {
    const fallbackResponse = await fetch(`${DEV_API_FALLBACK_BASE}${path}`, requestInit);
    response = fallbackResponse;
  }

  if (!response.ok) {
    if (response.status === 401 && includeAuth && unauthorizedHandler) {
      unauthorizedHandler();
    }

    const text = await response.text();
    let parsedMessage = "";

    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed?.message) {
        parsedMessage = parsed.message;
      }
    } catch {
      // Keep fallback when response is not JSON.
    }

    if (parsedMessage) {
      throw new Error(parsedMessage);
    }

    if (response.status >= 500) {
      throw new Error("Server error. Please try again in a moment.");
    }

    if (response.status >= 400) {
      throw new Error("We could not process that request. Please check your input and try again.");
    }

    throw new Error(`Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const fetchTasks = () => request<Task[]>("/tasks", "GET");
export const createTask = (task: Task) => request<Task>("/tasks", "POST", task);
export const updateTask = (taskId: string, updates: Partial<Task>) =>
  request<Task>(`/tasks/${taskId}`, "PUT", updates);
export const deleteTask = (taskId: string) => request<void>(`/tasks/${taskId}`, "DELETE");

export const fetchSchedules = () => request<Schedule[]>("/schedules", "GET");
export const createSchedule = (schedule: Omit<Schedule, "id">) =>
  request<Schedule>("/schedules", "POST", schedule);
export const updateSchedule = (scheduleId: string, updates: Partial<Omit<Schedule, "id">>) =>
  request<Schedule>(`/schedules/${scheduleId}`, "PUT", updates);
export const deleteSchedule = (scheduleId: string) =>
  request<void>(`/schedules/${scheduleId}`, "DELETE");

export const fetchColumns = () => request<Column[]>("/columns", "GET");
export const createColumn = (column: Column) =>
  request<Column>("/columns", "POST", column);
export const updateColumn = (columnId: string, updates: Partial<Column>) =>
  request<Column>(`/columns/${columnId}`, "PUT", updates);
export const deleteColumn = (columnId: string) =>
  request<void>(`/columns/${columnId}`, "DELETE");

export const signup = (email: string, password: string) =>
  request<AuthResponse>("/auth/signup", "POST", { email, password }, { includeAuth: false });

export const login = (email: string, password: string) =>
  request<AuthResponse>("/auth/login", "POST", { email, password }, { includeAuth: false });

export const forgotPassword = (email: string) =>
  request<{ message: string }>("/auth/forgot-password", "POST", { email }, { includeAuth: false });

export const fetchUserProfile = () => request<UserProfile>("/user/profile", "GET");

export const updateUserProfile = (updates: Pick<UserProfile, "name" | "phone" | "avatar">) =>
  request<UserProfile>("/user/profile", "PUT", updates);

export const deleteAccount = () => request<{ message: string }>("/user/account", "DELETE");

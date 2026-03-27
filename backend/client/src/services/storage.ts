type ThemeMode = "light" | "dark";
export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  avatar?: string;
  createdAt?: string;
};

const THEME_KEY = "lifeos-theme";
const AUTH_TOKEN_KEY = "lifeos-auth-token";
const AUTH_USER_KEY = "lifeos-auth-user";

const AUTH_STORAGE_KEYS = [AUTH_TOKEN_KEY, AUTH_USER_KEY] as const;

const getActiveAuthStorage = (): Storage | null => {
  if (localStorage.getItem(AUTH_TOKEN_KEY)) {
    return localStorage;
  }

  if (sessionStorage.getItem(AUTH_TOKEN_KEY)) {
    return sessionStorage;
  }

  return null;
};

const clearAuthStorageKeys = () => {
  AUTH_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

export const readThemePreference = (): ThemeMode => {
  const raw = localStorage.getItem(THEME_KEY);
  return raw === "dark" ? "dark" : "light";
};

export const writeThemePreference = (theme: ThemeMode): void => {
  localStorage.setItem(THEME_KEY, theme);
};

export const readAuthToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? sessionStorage.getItem(AUTH_TOKEN_KEY);
};

export const writeAuthToken = (token: string, rememberMe = true): void => {
  clearAuthStorageKeys();

  const target = rememberMe ? localStorage : sessionStorage;
  target.setItem(AUTH_TOKEN_KEY, token);
};

export const clearAuthToken = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
};

export const readAuthenticatedUser = (): AuthUser | null => {
  const storage = getActiveAuthStorage();
  const raw = storage?.getItem(AUTH_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const writeAuthenticatedUser = (user: AuthUser): void => {
  const storage = getActiveAuthStorage() ?? localStorage;
  storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const clearAuthenticatedUser = (): void => {
  localStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
};

export const clearAuthSession = (): void => {
  clearAuthToken();
  clearAuthenticatedUser();
};

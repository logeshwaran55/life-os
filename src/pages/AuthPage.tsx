import { useState } from "react";
import { login, signup } from "../services/api";
import type { AuthUser } from "../services/storage";

type AuthMode = "login" | "signup";

type Props = {
  initialMode?: AuthMode;
  onAuthenticated: (user: AuthUser, token: string) => void;
  onToggleTheme: () => void;
  theme: "light" | "dark";
};

export default function AuthPage({
  initialMode = "login",
  onAuthenticated,
  onToggleTheme,
  theme,
}: Props) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = mode === "login"
        ? await login(email.trim(), password)
        : await signup(email.trim(), password);

      onAuthenticated(result.user, result.token);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`auth-shell theme-${theme}`}>
      <div className="auth-card card section-card">
        <div className="auth-header">
          <div>
            <h1 className="title">Welcome to LifeOS</h1>
            <p className="subtitle">Sign in to sync your personal workspace and tasks.</p>
          </div>
          <button className="btn btn-ghost" onClick={onToggleTheme}>
            {theme === "light" ? "Dark" : "Light"}
          </button>
        </div>

        <div className="auth-switcher">
          <button
            className={`btn ${mode === "login" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setMode("login")}
            type="button"
          >
            Login
          </button>
          <button
            className={`btn ${mode === "signup" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setMode("signup")}
            type="button"
          >
            Signup
          </button>
        </div>

        <div className="auth-form-grid">
          <label className="auth-label" htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            className="input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label className="auth-label" htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            className="input"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void submit();
              }
            }}
          />
        </div>

        {error ? <div className="feedback-banner error">{error}</div> : null}

        <button className="btn btn-primary auth-submit" disabled={isSubmitting} onClick={() => void submit()}>
          {isSubmitting ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
        </button>
      </div>
    </div>
  );
}

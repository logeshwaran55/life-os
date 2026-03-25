import { useState } from "react";
import { forgotPassword, login, signup } from "../services/api";
import type { AuthUser } from "../services/storage";

type AuthMode = "login" | "signup";

type Props = {
  mode: AuthMode;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onSwitchMode: (nextMode: AuthMode) => void;
  onAuthenticated: (user: AuthUser, token: string, rememberMe: boolean) => void;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GOOGLE_AUTH_URL =
  import.meta.env.VITE_GOOGLE_AUTH_URL ?? "https://lifeos-backend-39pd.onrender.com/api/auth/google";

export default function AuthFormCard({
  mode,
  theme,
  onToggleTheme,
  onSwitchMode,
  onAuthenticated,
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const submit = async () => {
    setError("");
    setInfoMessage("");
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setPasswordError("Password is required.");
      return;
    }

    if (mode === "signup" && password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = mode === "login"
        ? await login(normalizedEmail, password)
        : await signup(normalizedEmail, password);

      if (mode === "login") {
        onAuthenticated(result.user, result.token, rememberMe);
        return;
      }

      setInfoMessage("Account created successfully. Redirecting to login...");
      window.setTimeout(() => {
        setPassword("");
        setConfirmPassword("");
        onSwitchMode("login");
      }, 900);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerForgotPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError("Enter your email first to continue.");
      return;
    }

    setError("");
    setInfoMessage("");
    try {
      const result = await forgotPassword(normalizedEmail);
      setInfoMessage(result.message);
    } catch (forgotError) {
      setError(forgotError instanceof Error ? forgotError.message : "Unable to process this request");
    }
  };

  const title = mode === "login" ? "Welcome back 👋" : "Create your account 🚀";
  const subtitle = mode === "login"
    ? "Sign in to continue with your personal workspace."
    : "Start your LifeOS workspace and sync tasks securely.";

  return (
    <div className={`auth-shell theme-${theme}`}>
      <section className="auth-hero card">
        <div className="auth-hero-logo">LifeOS</div>
        <h2 className="auth-hero-title">Build your personal operating system for work and life.</h2>
        <p className="auth-hero-copy">
          Organize tasks, plan your day, and stay in flow with an intelligent workspace made for momentum.
        </p>
      </section>

      <div className="auth-card card section-card">
        <div className="auth-header">
          <div>
            <h1 className="title">{title}</h1>
            <p className="subtitle">{subtitle}</p>
          </div>
          <button className="btn btn-ghost" onClick={onToggleTheme}>
            {theme === "light" ? "Dark" : "Light"}
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
          {emailError ? <p className="auth-field-error">{emailError}</p> : null}

          <label className="auth-label" htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            className="input"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={mode === "login" ? "Enter your password" : "Use at least 8 characters"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void submit();
              }
            }}
          />
          {passwordError ? <p className="auth-field-error">{passwordError}</p> : null}

          {mode === "signup" ? (
            <>
              <label className="auth-label" htmlFor="auth-confirm-password">Confirm password</label>
              <input
                id="auth-confirm-password"
                className="input"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void submit();
                  }
                }}
              />
              {confirmPasswordError ? <p className="auth-field-error">{confirmPasswordError}</p> : null}
            </>
          ) : null}

          <label className="auth-remember-row" htmlFor="auth-remember">
            <input
              id="auth-remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>Remember me</span>
          </label>
        </div>

        {error ? <div className="feedback-banner error">{error}</div> : null}
        {infoMessage ? <div className="feedback-banner info">{infoMessage}</div> : null}

        <button className="btn btn-primary auth-submit" disabled={isSubmitting} onClick={() => void submit()}>
          <span className="auth-submit-content">
            {isSubmitting ? <span className="btn-spinner" aria-hidden="true"></span> : null}
            {isSubmitting ? "Loading..." : mode === "login" ? "Login" : "Create account"}
          </span>
        </button>

        <div className="auth-links-row">
          {mode === "login" ? (
            <button className="btn btn-ghost auth-link" onClick={() => onSwitchMode("signup")}>Create account</button>
          ) : (
            <button className="btn btn-ghost auth-link" onClick={() => onSwitchMode("login")}>Already have an account?</button>
          )}
          <button className="btn btn-ghost auth-link" onClick={() => void triggerForgotPassword()}>Forgot Password?</button>
        </div>

        <button
          className="btn btn-ghost auth-google-btn"
          onClick={() => {
            window.location.href = GOOGLE_AUTH_URL;
          }}
        >
          <span className="auth-google-icon" aria-hidden="true">G</span>
          Continue with Google
        </button>
      </div>
    </div>
  );
}

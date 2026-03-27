import { useState } from "react";
import { deleteAccount } from "../services/api";

type ThemeMode = "light" | "dark";

type Props = {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onLogout: () => void;
  onAccountDeleted: () => void;
  onResetData: () => Promise<void>;
};

export default function SettingsPage({
  theme,
  onThemeChange,
  onLogout,
  onAccountDeleted,
  onResetData,
}: Props) {
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isResettingData, setIsResettingData] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("Delete your account permanently? This will remove your tasks, columns, and profile data.");
    if (!confirmed) {
      return;
    }

    setIsDeletingAccount(true);
    setError("");
    setSuccess("");

    try {
      await deleteAccount();
      onAccountDeleted();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "We could not delete your account yet. Please try again.");
      setIsDeletingAccount(false);
    }
  };

  const handleResetData = async () => {
    setIsResettingData(true);
    setError("");
    setSuccess("");

    try {
      await onResetData();
      setSuccess("Done. Your workspace data has been reset.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "We could not reset your workspace data yet. Please try again.");
    } finally {
      setIsResettingData(false);
    }
  };

  return (
    <div className="view-frame settings-page">
      {error ? <div className="feedback-banner error">{error}</div> : null}
      {success ? <div className="feedback-banner success">{success}</div> : null}

      <section className="card section-card settings-section" aria-label="Appearance">
        <h2 className="dashboard-section-title">Appearance</h2>
        <p className="dashboard-section-subtitle">Choose the look that feels best for your day.</p>

        <div className="theme-options" role="radiogroup" aria-label="Theme mode">
          <button
            className={`theme-option ${theme === "light" ? "active" : ""}`}
            role="radio"
            aria-checked={theme === "light"}
            onClick={() => onThemeChange("light")}
            disabled={isDeletingAccount || isResettingData}
          >
            Light mode
          </button>
          <button
            className={`theme-option ${theme === "dark" ? "active" : ""}`}
            role="radio"
            aria-checked={theme === "dark"}
            onClick={() => onThemeChange("dark")}
            disabled={isDeletingAccount || isResettingData}
          >
            Dark mode
          </button>
        </div>
      </section>

      <section className="card section-card settings-section" aria-label="Account">
        <h2 className="dashboard-section-title">Account</h2>
        <p className="dashboard-section-subtitle">Manage your session or permanently remove your account.</p>

        <div className="settings-actions-row">
          <button className="btn btn-ghost" onClick={onLogout} disabled={isDeletingAccount || isResettingData}>
            Sign out
          </button>
          <button
            className="btn btn-danger"
            onClick={() => void handleDeleteAccount()}
            disabled={isDeletingAccount || isResettingData}
          >
            {isDeletingAccount ? "Deleting your account..." : "Delete account"}
          </button>
        </div>
      </section>

      <section className="card section-card settings-section" aria-label="System">
        <h2 className="dashboard-section-title">System</h2>
        <p className="dashboard-section-subtitle">Reset tools for when you want a clean restart.</p>

        <div className="settings-actions-row">
          <button
            className="btn btn-ghost"
            onClick={() => void handleResetData()}
            disabled={isDeletingAccount || isResettingData}
          >
            {isResettingData ? "Resetting your data..." : "Reset workspace data"}
          </button>
        </div>
      </section>
    </div>
  );
}

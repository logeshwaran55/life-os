import { useEffect, useState } from "react";
import { fetchUserProfile, updateUserProfile, type UserProfile } from "../services/api";

type Props = {
  onProfileUpdated: (profile: UserProfile) => void;
};

export default function ProfilePage({ onProfileUpdated }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const initials = (name.trim() || "LifeOS User")
    .split(/\s+/)
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() ?? "")
    .join("");

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setIsLoading(true);
      setError("");
      setSuccess("");
      try {
        const profile = await fetchUserProfile();
        if (!active) {
          return;
        }

        setEmail(profile.email ?? "");
        setName(profile.name ?? "");
        setPhone(profile.phone ?? "");
        setAvatar(profile.avatar ?? "");
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "We could not load your profile just yet.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const saveProfile = async () => {
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await updateUserProfile({
        name: name.trim(),
        phone: phone.trim(),
        avatar: avatar.trim(),
      });
      setName(updated.name ?? "");
      setPhone(updated.phone ?? "");
      setAvatar(updated.avatar ?? "");
      onProfileUpdated(updated);
      setSuccess("Profile saved. Looking good.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We could not save your profile yet. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="view-frame profile-page">
      <section className="card section-card profile-card" aria-label="Your profile form">
        <h2 className="dashboard-section-title">Your Profile</h2>
        <p className="dashboard-section-subtitle">Keep your account details up to date so your workspace feels personal.</p>

        <div className="profile-avatar-row">
          {avatar ? (
            <img
              src={avatar}
              alt="Profile avatar"
              className="profile-avatar"
              onError={() => setAvatar("")}
            />
          ) : (
            <div className="profile-avatar profile-avatar-fallback" aria-label="Avatar fallback initials">
              {initials || "LU"}
            </div>
          )}
          <div>
            <p className="profile-avatar-title">Profile avatar</p>
            <p className="dashboard-section-subtitle">Paste an image URL, or leave it blank and we will use your initials.</p>
          </div>
        </div>

        {isLoading ? <div className="feedback-banner info">Loading your profile...</div> : null}
        {error ? <div className="feedback-banner error">{error}</div> : null}
        {success ? <div className="feedback-banner success">{success}</div> : null}

        <div className="profile-form-grid">
          <label className="auth-label" htmlFor="profile-email">Email</label>
          <input
            id="profile-email"
            className="input profile-readonly-input"
            type="email"
            value={email}
            readOnly
            disabled
          />

          <label className="auth-label" htmlFor="profile-name">Name</label>
          <input
            id="profile-name"
            className="input"
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isLoading || isSaving}
          />

          <label className="auth-label" htmlFor="profile-phone">Phone number</label>
          <input
            id="profile-phone"
            className="input"
            type="tel"
            placeholder="+1 555 123 4567"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={isLoading || isSaving}
          />

          <label className="auth-label" htmlFor="profile-avatar">Avatar URL</label>
          <input
            id="profile-avatar"
            className="input"
            type="url"
            placeholder="https://images.example.com/your-avatar.jpg"
            value={avatar}
            onChange={(event) => setAvatar(event.target.value)}
            disabled={isLoading || isSaving}
          />
        </div>

        <button
          className="btn btn-primary profile-save-btn"
          onClick={() => void saveProfile()}
          disabled={isLoading || isSaving}
        >
          {isSaving ? "Saving your changes..." : "Save changes"}
        </button>
      </section>
    </div>
  );
}

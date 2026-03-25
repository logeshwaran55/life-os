import AuthFormCard from "../components/AuthFormCard";
import type { AuthUser } from "../services/storage";

type Props = {
  onAuthenticated: (user: AuthUser, token: string, rememberMe: boolean) => void;
  onToggleTheme: () => void;
  theme: "light" | "dark";
  onSwitchToLogin: () => void;
};

export default function SignupPage({
  onAuthenticated,
  onToggleTheme,
  theme,
  onSwitchToLogin,
}: Props) {
  return (
    <AuthFormCard
      mode="signup"
      theme={theme}
      onToggleTheme={onToggleTheme}
      onSwitchMode={() => onSwitchToLogin()}
      onAuthenticated={onAuthenticated}
    />
  );
}

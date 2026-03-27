import AuthFormCard from "../components/AuthFormCard";
import type { AuthUser } from "../services/storage";

type Props = {
  onAuthenticated: (user: AuthUser, token: string, rememberMe: boolean) => void;
  onToggleTheme: () => void;
  theme: "light" | "dark";
  onSwitchToSignup: () => void;
};

export default function LoginPage({
  onAuthenticated,
  onToggleTheme,
  theme,
  onSwitchToSignup,
}: Props) {
  return (
    <AuthFormCard
      mode="login"
      theme={theme}
      onToggleTheme={onToggleTheme}
      onSwitchMode={() => onSwitchToSignup()}
      onAuthenticated={onAuthenticated}
    />
  );
}

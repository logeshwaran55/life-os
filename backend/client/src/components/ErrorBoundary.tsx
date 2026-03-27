import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("LifeOS UI error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-error-shell">
          <div className="app-error-card">
            <h2>Something went wrong</h2>
            <p>
              The app hit an unexpected UI error. Refresh the page to recover.
              Your data remains in the backend.
            </p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload LifeOS
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

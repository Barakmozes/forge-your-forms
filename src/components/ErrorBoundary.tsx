import { Component, type ErrorInfo, type ReactNode } from "react";
import { Translation } from "react-i18next";
import { logError } from "@/lib/errorLogger";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logError(error, {
      component: "ErrorBoundary",
      action: "componentDidCatch",
      metadata: { componentStack: errorInfo.componentStack ?? undefined },
    });
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Translation>
          {(t) => (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
              <h1 className="text-2xl font-semibold text-foreground">{t("common.somethingWentWrong")}</h1>
              <p className="text-muted-foreground">{t("common.unexpectedError")}</p>
              <Button onClick={this.handleReset}>{t("common.retry")}</Button>
            </div>
          )}
        </Translation>
      );
    }

    return this.props.children;
  }
}

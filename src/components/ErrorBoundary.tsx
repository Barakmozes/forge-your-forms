import { Component, type ErrorInfo, type ReactNode } from "react";
import { Translation } from "react-i18next";
import { logError } from "@/lib/errorLogger";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || "Unknown error" };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logError(error, {
      component: "ErrorBoundary",
      action: "componentDidCatch",
      metadata: {
        componentStack: errorInfo.componentStack ?? undefined,
        url: window.location.href,
      },
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Translation>
          {(t) => (
            <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-foreground">
                  {t("common.somethingWentWrong")}
                </h1>
                <p className="max-w-md text-muted-foreground">
                  {t("common.unexpectedError")}
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={this.handleReset}>
                  {t("common.retry")}
                </Button>
                <Button onClick={this.handleReload}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t("common.refresh", "Refresh Page")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("common.errorPersists", "If the problem persists, please contact support.")}
              </p>
            </div>
          )}
        </Translation>
      );
    }

    return this.props.children;
  }
}

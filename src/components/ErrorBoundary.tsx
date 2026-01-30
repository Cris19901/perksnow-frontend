import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary to catch React errors and prevent full app crash
 * Wraps the entire app to provide graceful error handling
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console (in production, send to error tracking service)
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // TODO: Send to error tracking service like Sentry
    // Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    // Reload the page to recover
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <AlertTriangle className="w-16 h-16 text-red-500" />
                <h2 className="text-2xl font-bold">Something went wrong</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  We encountered an unexpected error. Don't worry, your data is safe.
                </p>

                {import.meta.env.DEV && this.state.error && (
                  <div className="w-full mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-left">
                    <p className="text-sm font-mono text-red-800 dark:text-red-200 break-all">
                      {this.state.error.toString()}
                    </p>
                  </div>
                )}

                <Button
                  onClick={this.handleReset}
                  className="mt-4"
                  size="lg"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

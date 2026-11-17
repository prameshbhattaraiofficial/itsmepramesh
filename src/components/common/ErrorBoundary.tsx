import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/src/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught UI error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Something went wrong</h2>
          <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            {this.state.errorMessage || 'An unexpected rendering error occurred.'}
          </p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            Reload Application
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

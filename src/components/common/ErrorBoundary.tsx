import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Shown instead of the default panel, e.g. for route-level boundaries. */
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time failures so one broken component cannot take the whole
 * application down to a blank white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-xl">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-destructive" aria-hidden="true" />
            <h1 className="mb-2 text-xl font-semibold">Something went wrong</h1>
            <p className="mb-6 text-muted-foreground">
              This part of the application failed to load. You can try again, or head back to the
              home page.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={this.reset}>Try again</Button>
              <Button variant="outline" onClick={() => window.location.assign('/')}>
                Go home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}

import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { render } from '@testing-library/react';
import { AuthProvider } from '@/hooks/use-auth';

/** A query client that never retries, so a failing request fails fast. */
export function testQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

/** Renders a component with every provider the app supplies. */
export function renderApp(ui: ReactElement) {
  const client = testQueryClient();
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <TooltipProvider>
            <BrowserRouter>{ui}</BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    ),
  };
}

/** Wraps children in providers without rendering to a container (for hooks). */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={testQueryClient()}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>{children}</BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

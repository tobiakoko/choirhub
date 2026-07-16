import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query client. Retries are conservative — onboarding runs on
 * flaky 2G/3G, and a failed OTP or invite check should surface a recoverable
 * error quickly rather than spin.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
    mutations: {
      retry: 0,
    },
  },
});

import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000, // 30s — matches operational tempo for field use
			retry: 2,
			retryDelay: 1000,
		},
		mutations: {
			retry: 0, // never auto-retry dispatches or plan generation
		},
	},
})

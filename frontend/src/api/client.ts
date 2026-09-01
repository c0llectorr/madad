import { create } from 'axios'
import { secureStorage } from '../lib/secureStorage'

export const apiClient = create({
	baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
	timeout: 15_000, // 15s — field conditions may have latency
	headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach Bearer token to every request automatically
apiClient.interceptors.request.use(async (config) => {
	const session = await secureStorage.loadSession()
	if (session?.token) {
		config.headers.Authorization = `Bearer ${session.token}`
	}
	return config
})

// Response interceptor: handle 401 globally
// The actual navigation reset happens via a callback registered by AuthContext —
// do NOT import useNavigation here; axios interceptors are module-level singletons
// and React hooks only work inside components. This pattern avoids circular imports.
let onUnauthorized: (() => void) | null = null

export const setUnauthorizedHandler = (handler: () => void): void => {
	onUnauthorized = handler
}

apiClient.interceptors.response.use(
	(response) => response,
	async (error) => {
		if (error.response?.status === 401) {
			await secureStorage.clearSession()
			onUnauthorized?.()
		}
		return Promise.reject(error)
	}
)

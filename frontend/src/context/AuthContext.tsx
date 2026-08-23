import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	ReactNode,
} from 'react'
import { secureStorage } from '../lib/secureStorage'
import { setUnauthorizedHandler } from '../api/client'
import { Session, Role } from '../types'

interface AuthContextValue {
	session: Session | null
	isLoading: boolean
	signIn: (
		token: string,
		role: Role,
		centerId: number,
		centerName: string
	) => Promise<void>
	signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
	const [session, setSession] = useState<Session | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	// Restore persisted session on mount
	useEffect(() => {
		secureStorage.loadSession().then((stored) => {
			if (stored) {
				setSession({
					token: stored.token,
					role: stored.role,
					center_id: stored.centerId,
					center_name: stored.centerName,
				})
			}
			setIsLoading(false)
		})
	}, [])

	// Register the 401 handler so the axios interceptor can trigger sign-out
	// without importing navigation or React hooks inside client.ts
	const handleUnauthorized = useCallback(() => {
		setSession(null)
	}, [])

	useEffect(() => {
		setUnauthorizedHandler(handleUnauthorized)
	}, [handleUnauthorized])

	const signIn = useCallback(
		async (
			token: string,
			role: Role,
			centerId: number,
			centerName: string
		) => {
			await secureStorage.saveSession(token, centerId, centerName, role)
			setSession({
				token,
				role,
				center_id: centerId,
				center_name: centerName,
			})
		},
		[]
	)

	const signOut = useCallback(async () => {
		await secureStorage.clearSession()
		setSession(null)
	}, [])

	return (
		<AuthContext.Provider value={{ session, isLoading, signIn, signOut }}>
			{children}
		</AuthContext.Provider>
	)
}

export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext)
	if (!ctx) {
		throw new Error('useAuth must be used within an AuthProvider')
	}
	return ctx
}

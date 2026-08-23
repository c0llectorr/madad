import * as SecureStore from 'expo-secure-store'
import { Role } from '../types'

const KEYS = {
	ACCESS_TOKEN: 'madad_access_token',
	CENTER_ID: 'madad_center_id',
	CENTER_NAME: 'madad_center_name',
	ROLE: 'madad_role',
} as const

export interface StoredSession {
	token: string
	centerId: number
	centerName: string
	role: Role
}

export const secureStorage = {
	saveSession: async (
		token: string,
		centerId: number,
		centerName: string,
		role: Role
	): Promise<void> => {
		await Promise.all([
			SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, token),
			SecureStore.setItemAsync(KEYS.CENTER_ID, String(centerId)),
			SecureStore.setItemAsync(KEYS.CENTER_NAME, centerName),
			SecureStore.setItemAsync(KEYS.ROLE, role),
		])
	},

	loadSession: async (): Promise<StoredSession | null> => {
		const [token, centerId, centerName, role] = await Promise.all([
			SecureStore.getItemAsync(KEYS.ACCESS_TOKEN),
			SecureStore.getItemAsync(KEYS.CENTER_ID),
			SecureStore.getItemAsync(KEYS.CENTER_NAME),
			SecureStore.getItemAsync(KEYS.ROLE),
		])

		if (!token || !centerId) return null

		return {
			token,
			centerId: Number(centerId),
			centerName: centerName ?? '',
			role: (role ?? 'coordinator') as Role,
		}
	},

	clearSession: async (): Promise<void> => {
		await Promise.all(
			Object.values(KEYS).map((k) => SecureStore.deleteItemAsync(k))
		)
	},
}

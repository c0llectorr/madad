import { apiClient } from './client'
import { LoginRequest, LoginResponse, Center } from '../types'

export const authApi = {
	login: async (data: LoginRequest): Promise<LoginResponse> => {
		// API contract only accepts { username, password } — center_code is
		// frontend-only UX to help users identify their center, not sent to server.
		const response = await apiClient.post<LoginResponse>('/auth/login', {
			username: data.username,
			password: data.password,
		})
		return response.data
	},

	getCenters: async (): Promise<Center[]> => {
		const response = await apiClient.get<Center[]>('/centers')
		return response.data
	},
}

import { apiClient } from './client'
import { LoginRequest, LoginResponse, Center } from '../types'

export const authApi = {
	login: async (data: LoginRequest): Promise<LoginResponse> => {
		const response = await apiClient.post<LoginResponse>(
			'/auth/login',
			data
		)
		return response.data
	},

	getCenters: async (): Promise<Center[]> => {
		const response = await apiClient.get<Center[]>('/centers')
		return response.data
	},
}

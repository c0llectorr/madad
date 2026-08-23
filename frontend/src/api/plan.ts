import { apiClient } from './client'
import { GeneratePlanResponse, ReplanRequest, ReplanResponse } from '../types'

export const planApi = {
	generate: async (centerId: number): Promise<GeneratePlanResponse> => {
		const response = await apiClient.post<GeneratePlanResponse>(
			'/plan/generate',
			{
				center_id: centerId,
			}
		)
		return response.data
	},

	replan: async (data: ReplanRequest): Promise<ReplanResponse> => {
		const response = await apiClient.post<ReplanResponse>(
			'/plan/replan',
			data
		)
		return response.data
	},
}

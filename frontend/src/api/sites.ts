import { apiClient } from './client'
import { Site, SiteStatus } from '../types'

export const sitesApi = {
	list: async (centerId: number, status?: SiteStatus): Promise<Site[]> => {
		const response = await apiClient.get<Site[]>('/sites', {
			params: { center_id: centerId, ...(status ? { status } : {}) },
		})
		return response.data
	},
}

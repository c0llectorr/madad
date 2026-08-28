import { apiClient } from './client'
import {
	ReportRoadDamageRequest,
	ReportRoadDamageResponse,
	DamagedRoad,
	RouteResponse,
} from '../types'

export const roadsApi = {
	reportDamage: async (
		data: ReportRoadDamageRequest
	): Promise<ReportRoadDamageResponse> => {
		const response = await apiClient.post<ReportRoadDamageResponse>(
			'/roads/damage',
			data
		)
		return response.data
	},

	listDamaged: async (centerId: number): Promise<DamagedRoad[]> => {
		const response = await apiClient.get<DamagedRoad[]>('/roads/damaged', {
			params: { center_id: centerId },
		})
		return response.data
	},

	getRoute: async (
		fromDepotId: number,
		toSiteId: number
	): Promise<RouteResponse> => {
		const response = await apiClient.get<RouteResponse>('/routes', {
			params: { from_depot_id: fromDepotId, to_site_id: toSiteId },
		})
		return response.data
	},
}

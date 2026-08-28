import { apiClient } from './client'
import {
	Depot,
	AdjustInventoryRequest,
	AdjustInventoryResponse,
} from '../types'

export const depotsApi = {
	list: async (centerId: number): Promise<Depot[]> => {
		const response = await apiClient.get<Depot[]>('/depots', {
			params: { center_id: centerId },
		})
		return response.data
	},

	adjustInventory: async (
		depotId: number,
		data: AdjustInventoryRequest
	): Promise<AdjustInventoryResponse> => {
		const response = await apiClient.patch<AdjustInventoryResponse>(
			`/depots/${depotId}/inventory`,
			data
		)
		return response.data
	},
}

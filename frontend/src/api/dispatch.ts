import { apiClient } from './client'
import {
	CreateDispatchRequest,
	CreateDispatchResponse,
	UpdateDispatchStatusRequest,
	UpdateDispatchStatusResponse,
} from '../types'

export const dispatchApi = {
	create: async (
		data: CreateDispatchRequest
	): Promise<CreateDispatchResponse> => {
		const response = await apiClient.post<CreateDispatchResponse>(
			'/dispatch',
			data
		)
		return response.data
	},

	updateStatus: async (
		dispatchId: number,
		data: UpdateDispatchStatusRequest
	): Promise<UpdateDispatchStatusResponse> => {
		const response = await apiClient.patch<UpdateDispatchStatusResponse>(
			`/dispatch/${dispatchId}/status`,
			data
		)
		return response.data
	},
}

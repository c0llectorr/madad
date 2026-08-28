import { apiClient } from './client'
import {
	CreateReportRequest,
	CreateReportResponse,
	ReportListItem,
	ExtractReportResponse,
	ConfirmReportRequest,
	ConfirmReportResponse,
	ReportStatus,
} from '../types'

export const reportsApi = {
	list: async (
		centerId: number,
		status?: ReportStatus
	): Promise<ReportListItem[]> => {
		const response = await apiClient.get<ReportListItem[]>('/reports', {
			params: { center_id: centerId, ...(status ? { status } : {}) },
		})
		return response.data
	},

	create: async (
		data: CreateReportRequest
	): Promise<CreateReportResponse> => {
		const response = await apiClient.post<CreateReportResponse>(
			'/reports',
			data
		)
		return response.data
	},

	extract: async (reportId: number): Promise<ExtractReportResponse> => {
		const response = await apiClient.post<ExtractReportResponse>(
			`/reports/${reportId}/extract`
		)
		return response.data
	},

	confirm: async (
		reportId: number,
		data: ConfirmReportRequest
	): Promise<ConfirmReportResponse> => {
		const response = await apiClient.patch<ConfirmReportResponse>(
			`/reports/${reportId}`,
			data
		)
		return response.data
	},
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsApi } from '../api/reports'
import { useAuth } from '../context/AuthContext'
import {
	ReportStatus,
	CreateReportRequest,
	ConfirmReportRequest,
} from '../types'

export const reportKeys = {
	all: (centerId: number) => ['reports', centerId] as const,
	filtered: (centerId: number, status: ReportStatus) =>
		['reports', centerId, status] as const,
}

export function useReports(status?: ReportStatus) {
	const { session } = useAuth()
	const centerId = session!.center_id
	return useQuery({
		queryKey: status
			? reportKeys.filtered(centerId, status)
			: reportKeys.all(centerId),
		queryFn: () => reportsApi.list(centerId, status),
		enabled: !!session,
	})
}

export function useCreateReport() {
	const qc = useQueryClient()
	const { session } = useAuth()
	return useMutation({
		mutationFn: (data: CreateReportRequest) => reportsApi.create(data),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: reportKeys.all(session!.center_id),
			}),
	})
}

export function useExtractReport() {
	const qc = useQueryClient()
	const { session } = useAuth()
	return useMutation({
		mutationFn: (reportId: number) => reportsApi.extract(reportId),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: reportKeys.all(session!.center_id),
			}),
	})
}

export function useConfirmReport() {
	const qc = useQueryClient()
	const { session } = useAuth()
	return useMutation({
		mutationFn: ({
			reportId,
			data,
		}: {
			reportId: number
			data: ConfirmReportRequest
		}) => reportsApi.confirm(reportId, data),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: reportKeys.all(session!.center_id),
			}),
	})
}

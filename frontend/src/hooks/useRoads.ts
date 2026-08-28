import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { roadsApi } from '../api/roads'
import { useAuth } from '../context/AuthContext'
import { ReportRoadDamageRequest } from '../types'

export const roadKeys = {
	damaged: (centerId: number) => ['roads', 'damaged', centerId] as const,
	route: (fromDepotId: number, toSiteId: number) =>
		['routes', fromDepotId, toSiteId] as const,
}

export function useDamagedRoads() {
	const { session } = useAuth()
	const centerId = session!.center_id
	return useQuery({
		queryKey: roadKeys.damaged(centerId),
		queryFn: () => roadsApi.listDamaged(centerId),
		enabled: !!session,
	})
}

export function useRoute(fromDepotId: number | null, toSiteId: number | null) {
	return useQuery({
		queryKey: roadKeys.route(fromDepotId!, toSiteId!),
		queryFn: () => roadsApi.getRoute(fromDepotId!, toSiteId!),
		enabled: fromDepotId !== null && toSiteId !== null,
	})
}

export function useReportRoadDamage() {
	const qc = useQueryClient()
	const { session } = useAuth()
	return useMutation({
		mutationFn: (data: ReportRoadDamageRequest) =>
			roadsApi.reportDamage(data),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: roadKeys.damaged(session!.center_id),
			}),
	})
}

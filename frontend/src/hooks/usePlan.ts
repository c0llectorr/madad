import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { planApi } from '../api/plan'
import { useAuth } from '../context/AuthContext'
import { useUIStore } from '../store/uiStore'
import { ReplanTrigger } from '../types'

export const planKeys = {
	current: (centerId: number) => ['plan', centerId] as const,
}

export function usePlan() {
	const { session } = useAuth()
	const centerId = session!.center_id
	return useQuery({
		queryKey: planKeys.current(centerId),
		queryFn: () => planApi.generate(centerId),
		enabled: !!session,
	})
}

export function useGeneratePlan() {
	const qc = useQueryClient()
	const { session } = useAuth()
	return useMutation({
		mutationFn: () => planApi.generate(session!.center_id),
		onSuccess: (data) => {
			qc.setQueryData(planKeys.current(session!.center_id), data)
		},
	})
}

export function useReplan() {
	const qc = useQueryClient()
	const { session } = useAuth()
	const setReplanChangedSiteIds = useUIStore((s) => s.setReplanChangedSiteIds)
	return useMutation({
		mutationFn: (trigger: ReplanTrigger) =>
			planApi.replan({ center_id: session!.center_id, trigger }),
		onSuccess: (data) => {
			// Surface changed site IDs so AllocationPlanScreen can animate them
			setReplanChangedSiteIds(data.changed.map((c) => c.site_id))
			qc.invalidateQueries({
				queryKey: planKeys.current(session!.center_id),
			})
		},
	})
}

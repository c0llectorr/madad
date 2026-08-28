import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { depotsApi } from '../api/depots'
import { useAuth } from '../context/AuthContext'
import { AdjustInventoryRequest } from '../types'

export const depotKeys = {
	all: (centerId: number) => ['depots', centerId] as const,
}

export function useDepots() {
	const { session } = useAuth()
	const centerId = session!.center_id
	return useQuery({
		queryKey: depotKeys.all(centerId),
		queryFn: () => depotsApi.list(centerId),
		enabled: !!session,
	})
}

export function useAdjustInventory() {
	const qc = useQueryClient()
	const { session } = useAuth()
	return useMutation({
		mutationFn: ({
			depotId,
			data,
		}: {
			depotId: number
			data: AdjustInventoryRequest
		}) => depotsApi.adjustInventory(depotId, data),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: depotKeys.all(session!.center_id),
			}),
	})
}

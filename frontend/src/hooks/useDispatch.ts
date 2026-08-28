import { useMutation, useQueryClient } from '@tanstack/react-query'
import { dispatchApi } from '../api/dispatch'
import { useAuth } from '../context/AuthContext'
import { planKeys } from './usePlan'
import { siteKeys } from './useSites'
import { CreateDispatchRequest } from '../types'

export function useCreateDispatch() {
	const qc = useQueryClient()
	const { session } = useAuth()
	return useMutation({
		mutationFn: (data: CreateDispatchRequest) => dispatchApi.create(data),
		onSuccess: () => {
			// Invalidate plan and sites — both change after a dispatch is created
			qc.invalidateQueries({
				queryKey: planKeys.current(session!.center_id),
			})
			qc.invalidateQueries({ queryKey: siteKeys.all(session!.center_id) })
		},
	})
}

export function useUpdateDispatchStatus() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({
			dispatchId,
			status,
		}: {
			dispatchId: number
			status: 'en_route' | 'delivered'
		}) => dispatchApi.updateStatus(dispatchId, { status }),
		onSuccess: (_, { dispatchId }) => {
			// Invalidate the specific dispatch so status buttons re-render from server truth
			qc.invalidateQueries({ queryKey: ['dispatch', dispatchId] })
		},
		onError: () => {
			// Do NOT optimistically update — let the screen show the error and keep old state
		},
	})
}

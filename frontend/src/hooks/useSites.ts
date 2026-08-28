import { useQuery } from '@tanstack/react-query'
import { sitesApi } from '../api/sites'
import { useAuth } from '../context/AuthContext'
import { SiteStatus } from '../types'

export const siteKeys = {
	all: (centerId: number) => ['sites', centerId] as const,
	filtered: (centerId: number, status: SiteStatus) =>
		['sites', centerId, status] as const,
}

export function useSites(status?: SiteStatus) {
	const { session } = useAuth()
	const centerId = session!.center_id
	return useQuery({
		queryKey: status
			? siteKeys.filtered(centerId, status)
			: siteKeys.all(centerId),
		queryFn: () => sitesApi.list(centerId, status),
		enabled: !!session,
	})
}

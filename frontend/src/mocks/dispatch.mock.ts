import { CreateDispatchResponse } from '../types'
import { mockRoute_1_1, mockRoute_2_2 } from './roads.mock'

// Pre-seeded dispatch responses used by dispatchStatuses in index.ts.
// Route geometry reuses the same real OSRM-sourced coordinates from roads.mock.ts
// so dispatch detail and route lookup are always consistent.

export const mockDispatch: CreateDispatchResponse = {
	dispatch_id: 101,
	status: 'planned',
	route: {
		geojson: mockRoute_1_1.geojson,
		distance_km: mockRoute_1_1.distance_km,
	},
	eta_minutes: mockRoute_1_1.eta_minutes,
}

export const mockDispatchEnRoute: CreateDispatchResponse = {
	dispatch_id: 102,
	status: 'planned',
	route: {
		geojson: mockRoute_2_2.geojson,
		distance_km: mockRoute_2_2.distance_km,
	},
	eta_minutes: mockRoute_2_2.eta_minutes,
}

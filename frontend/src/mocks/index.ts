/**
 * Mock API handler — intercepts every outgoing axios request on apiClient
 * and returns local data instead of hitting the real backend.
 *
 * Activated when EXPO_PUBLIC_USE_MOCK=true in .env.
 * Call setupMocks() once at app boot (app/_layout.tsx) before any component mounts.
 *
 * Zero changes are required in any hook, API file, or component — the axios
 * interceptor sits below the entire API layer and is completely transparent.
 */

import MockAdapter from 'axios-mock-adapter'
import { apiClient } from '../api/client'

// ─── Mock data ───────────────────────────────────────────────────────────────

import { mockLoginResponse, mockCenters } from './auth.mock'
import {
	mockReports,
	mockExtractResponse,
	mockExtractUnmatchedResponse,
} from './reports.mock'
import { mockSites } from './sites.mock'
import { mockDepots } from './depots.mock'
import { mockDispatch, mockDispatchEnRoute } from './dispatch.mock'
import { mockPlan, mockReplanResponse } from './plan.mock'
import {
	mockDamagedRoads,
	mockRoute_1_1,
	mockRoute_2_2,
	mockRoute_1_3,
	mockRoute_2_4,
	mockRouteFallback,
} from './roads.mock'

import {
	ConfirmReportRequest,
	AdjustInventoryRequest,
	UpdateDispatchStatusRequest,
	RouteResponse,
} from '../types'

// ─── In-memory state ─────────────────────────────────────────────────────────
// Mutations update these arrays so subsequent GETs reflect the change within
// the same dev session — simulating a real database without any persistence.

let reports = [...mockReports]
let sites = [...mockSites]
let depots = mockDepots.map((d) => ({ ...d, inventory: [...d.inventory] }))
let damagedRoads = [...mockDamagedRoads]

// Dispatch status store: dispatch_id → status
const dispatchStatuses: Record<number, 'planned' | 'en_route' | 'delivered'> = {
	[mockDispatch.dispatch_id]: mockDispatch.status,
	[mockDispatchEnRoute.dispatch_id]: mockDispatchEnRoute.status,
}

// Next auto-increment IDs
let nextReportId = 5
let nextSiteId = 5
let nextRoadDamageId = damagedRoads.length + 1
let nextDispatchId = 103

// ─── Route lookup table ───────────────────────────────────────────────────────

const routeTable: Record<string, RouteResponse> = {
	'1_1': mockRoute_1_1,
	'2_2': mockRoute_2_2,
	'1_3': mockRoute_1_3,
	'2_4': mockRoute_2_4,
}

function getRoute(fromDepotId: string, toSiteId: string): RouteResponse {
	return routeTable[`${fromDepotId}_${toSiteId}`] ?? mockRouteFallback
}

// ─── Setup ───────────────────────────────────────────────────────────────────

export function setupMocks(): void {
	if (process.env.EXPO_PUBLIC_USE_MOCK !== 'true') return

	// delayResponse: simulate realistic network latency (ms)
	const mock = new MockAdapter(apiClient, {
		delayResponse: 400,
		onNoMatch: 'throwException',
	})

	// ── Auth ──────────────────────────────────────────────────────────────────

	mock.onPost('/auth/login').reply((_config) => {
		// Any credentials are accepted in mock mode — credentials are irrelevant
		// without a real backend. The coordinator role is returned by default.
		return [200, mockLoginResponse]
	})

	mock.onGet('/centers').reply(200, mockCenters)

	// ── Reports ───────────────────────────────────────────────────────────────

	mock.onGet('/reports').reply((config) => {
		const status = config.params?.status
		const filtered = status
			? reports.filter((r) => r.status === status)
			: reports
		return [200, filtered]
	})

	mock.onPost('/reports').reply((config) => {
		const body = JSON.parse(config.data ?? '{}')
		const isManual = body.source === 'manual'
		const newReport = {
			report_id: nextReportId++,
			raw_text: isManual ? null : (body.raw_text ?? null),
			status: isManual
				? ('confirmed' as const)
				: ('pending_extraction' as const),
			created_at: new Date().toISOString(),
		}
		reports = [...reports, newReport]

		if (isManual && body.structured_fields) {
			// Manual reports bypass extraction — immediately create a site
			const fields = body.structured_fields
			sites = [
				...sites,
				{
					id: nextSiteId++,
					location_name: fields.location_name,
					lat: 33.65 + Math.random() * 0.05,
					lng: 73.0 + Math.random() * 0.05,
					estimated_population: fields.headcount,
					needs: fields.needs ?? [],
					urgency_flags: [],
					confidence: 'single_unverified' as const,
					priority_score: 0.5,
					status: 'unserved' as const,
					severity: fields.severity,
				},
			]
		}

		return [
			201,
			{ report_id: newReport.report_id, status: newReport.status },
		]
	})

	mock.onPost(/\/reports\/(\d+)\/extract/).reply((config) => {
		// Extract report_id from URL: /reports/1/extract → "1"
		const reportId = Number(config.url?.split('/')[2])
		reports = reports.map((r) =>
			r.report_id === reportId
				? { ...r, status: 'extracted' as const }
				: r
		)
		// Return the unmatched mock for report 2 to exercise the pin-drop flow,
		// the standard matched mock for everything else
		return [
			200,
			reportId === 2
				? mockExtractUnmatchedResponse
				: { ...mockExtractResponse, report_id: reportId },
		]
	})

	mock.onPatch(/\/reports\/(\d+)$/).reply((config) => {
		const reportId = Number(config.url?.split('/').at(-1))
		const body: ConfirmReportRequest = JSON.parse(config.data ?? '{}')

		reports = reports.map((r) =>
			r.report_id === reportId ? { ...r, status: body.status } : r
		)

		let siteId: number | null = null
		if (body.status === 'confirmed') {
			siteId = nextSiteId++
			sites = [
				...sites,
				{
					id: siteId,
					location_name: body.location_name,
					lat: body.lat,
					lng: body.lng,
					estimated_population: body.estimated_population,
					needs: body.needs,
					urgency_flags: body.urgency_flags,
					confidence: 'single_unverified' as const,
					priority_score: 0.6,
					status: 'unserved' as const,
				},
			]
		}

		return [200, { site_id: siteId, status: body.status }]
	})

	// ── Sites ─────────────────────────────────────────────────────────────────

	mock.onGet('/sites').reply((config) => {
		const status = config.params?.status
		const filtered = status
			? sites.filter((s) => s.status === status)
			: sites
		return [200, filtered]
	})

	// ── Depots ────────────────────────────────────────────────────────────────

	mock.onGet('/depots').reply(200, depots)

	mock.onPatch(/\/depots\/(\d+)\/inventory/).reply((config) => {
		const depotId = Number(config.url?.split('/')[2])
		const body: AdjustInventoryRequest = JSON.parse(config.data ?? '{}')

		let updatedQty = 0
		depots = depots.map((d) => {
			if (d.id !== depotId) return d
			const inventory = d.inventory.map((item) => {
				if (item.resource_type !== body.resource_type) return item
				updatedQty = Math.max(0, item.quantity + body.quantity_delta)
				return { ...item, quantity: updatedQty }
			})
			return { ...d, inventory }
		})

		return [
			200,
			{ resource_type: body.resource_type, quantity: updatedQty },
		]
	})

	// ── Dispatch ──────────────────────────────────────────────────────────────

	mock.onPost('/dispatch').reply((config) => {
		const body = JSON.parse(config.data ?? '{}')
		const dispatchId = nextDispatchId++

		// Mark the site as dispatched
		sites = sites.map((s) =>
			s.id === body.site_id ? { ...s, status: 'dispatched' as const } : s
		)

		// Deduct resources from depot inventory
		depots = depots.map((d) => {
			if (d.id !== body.depot_id) return d
			const inventory = d.inventory.map((item) => {
				const dispatched = (
					body.resources as {
						resource_type: string
						quantity: number
					}[]
				).find((r) => r.resource_type === item.resource_type)
				return dispatched
					? {
							...item,
							quantity: Math.max(
								0,
								item.quantity - dispatched.quantity
							),
						}
					: item
			})
			return { ...d, inventory }
		})

		dispatchStatuses[dispatchId] = 'planned'

		const route = getRoute(String(body.depot_id), String(body.site_id))
		return [
			201,
			{
				dispatch_id: dispatchId,
				status: 'planned',
				route: {
					geojson: route.geojson,
					distance_km: route.distance_km,
				},
				eta_minutes: route.eta_minutes,
			},
		]
	})

	mock.onPatch(/\/dispatch\/(\d+)\/status/).reply((config) => {
		const dispatchId = Number(config.url?.split('/')[2])
		const body: UpdateDispatchStatusRequest = JSON.parse(
			config.data ?? '{}'
		)

		dispatchStatuses[dispatchId] = body.status

		// When delivered, update the corresponding site status too
		if (body.status === 'delivered') {
			// We don't track dispatchId → siteId in mock state, so mark the first
			// dispatched site as delivered to simulate the flow
			const dispatchedSite = sites.find((s) => s.status === 'dispatched')
			if (dispatchedSite) {
				sites = sites.map((s) =>
					s.id === dispatchedSite.id
						? { ...s, status: 'delivered' as const }
						: s
				)
			}
		}

		return [200, { dispatch_id: dispatchId, status: body.status }]
	})

	// ── Plan ──────────────────────────────────────────────────────────────────

	mock.onPost('/plan/generate').reply(200, mockPlan)

	mock.onPost('/plan/replan').reply((_config) => {
		// Simulate a replan: promote site 4 in rank
		return [200, mockReplanResponse]
	})

	// ── Roads ─────────────────────────────────────────────────────────────────

	mock.onGet('/roads/damaged').reply(200, damagedRoads)

	mock.onPost('/roads/damage').reply((config) => {
		const body = JSON.parse(config.data ?? '{}')
		const newEntry = {
			id: nextRoadDamageId++,
			lat: body.lat,
			lng: body.lng,
			reason: body.reason ?? null,
			reported_at: new Date().toISOString(),
			active: true as const,
		}
		damagedRoads = [...damagedRoads, newEntry]
		return [201, { id: newEntry.id, active: true as const }]
	})

	mock.onGet('/routes').reply((config) => {
		const { from_depot_id, to_site_id } = config.params ?? {}
		return [200, getRoute(String(from_depot_id), String(to_site_id))]
	})

	if (__DEV__) {
		console.log(
			'[mock] API mock layer active — all requests intercepted locally'
		)
	}
}

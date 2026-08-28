// MADAD TypeScript interfaces — mirrors API_CONTRACT.md exactly
// If the API contract changes, update here first. This is the single source of type truth on the frontend.

// ─── Enums ────────────────────────────────────────────────────────────────────

export type Role = 'coordinator' | 'admin'

export type ReportSource = 'manual' | 'sms_stub'

export type ReportStatus =
	'pending_extraction' | 'extracted' | 'confirmed' | 'rejected'

export type NeedType =
	| 'food'
	| 'water'
	| 'medical_evacuation'
	| 'shelter'
	| 'medicine'
	| 'general_evacuation'

// Urgency flags returned by the AI extraction pipeline (used in ExtractedFields
// and Site). The backend may return either the structured-report set or the
// AI-extracted set depending on the report source.
export type UrgencyFlag =
	// Structured / manual report flags (coordinator-entered)
	| 'elderly_present'
	| 'children_present'
	| 'pregnancy'
	| 'injury_reported'
	| 'water_rising'
	| 'stranded_no_exit'
	// AI-extracted flags (returned by extraction pipeline)
	| 'mass_casualty'
	| 'critical_medical'
	| 'infrastructure_collapse'
	| 'flooding'
	| 'fire'
	| 'trapped_persons'

export type Severity = 'low' | 'medium' | 'high' | 'critical'

export type Confidence = 'single_unverified' | 'corroborated'

export type GeocodeStatus = 'matched' | 'unmatched'

export type SiteStatus = 'unserved' | 'planned' | 'dispatched' | 'delivered'

export type DispatchStatus = 'planned' | 'en_route' | 'delivered'

export type ReplanTrigger = 'new_report' | 'road_damage' | 'dispatch_complete'

// ─── Shared Shapes ────────────────────────────────────────────────────────────

/** Canonical resource shape — always an array of objects, never a dict */
export interface Resource {
	resource_type: string
	quantity: number
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
	center_code: string
	username: string
	password: string
}

export interface LoginResponse {
	access_token: string
	token_type: 'bearer'
	role: Role
	center_id: number
	center_name: string
}

// ─── Centers ──────────────────────────────────────────────────────────────────

export interface Center {
	id: number
	code: string
	name: string
	region: string
	lat: number
	lng: number
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface StructuredReportFields {
	location_name: string
	headcount: number // maps to estimated_population server-side
	severity: Severity
	needs: NeedType[]
	contact_number?: string
}

export interface CreateReportRequest {
	center_id: number
	source: ReportSource
	raw_text?: string
	structured_fields?: StructuredReportFields
}

export interface CreateReportResponse {
	report_id: number
	status: ReportStatus
}

export interface ReportListItem {
	report_id: number
	raw_text: string | null
	status: ReportStatus
	created_at: string // ISO 8601
}

export interface ExtractedFields {
	location_name: string
	estimated_population: number
	needs: NeedType[]
	urgency_flags: UrgencyFlag[]
	confidence: Confidence
}

export interface ExtractReportResponse {
	report_id: number
	extracted: ExtractedFields
	geocode_status: GeocodeStatus
}

export interface ConfirmReportRequest {
	location_name: string
	lat: number
	lng: number
	estimated_population: number
	needs: NeedType[]
	urgency_flags: UrgencyFlag[]
	status: 'confirmed' | 'rejected'
}

export interface ConfirmReportResponse {
	site_id: number | null // null when status=rejected
	status: string
}

// ─── Sites ────────────────────────────────────────────────────────────────────

export interface Site {
	id: number
	location_name: string
	lat: number
	lng: number
	estimated_population: number
	needs: NeedType[]
	urgency_flags: UrgencyFlag[]
	confidence: Confidence
	priority_score: number
	status: SiteStatus
	severity?: Severity // populated only via manual report path
}

// ─── Depots ───────────────────────────────────────────────────────────────────

export interface Depot {
	id: number
	name: string
	lat: number
	lng: number
	inventory: Resource[]
}

export interface AdjustInventoryRequest {
	resource_type: string
	quantity_delta: number // can be negative
}

export interface AdjustInventoryResponse {
	resource_type: string
	quantity: number
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

export interface Allocation {
	site_id: number
	depot_id: number
	rank: number
	priority_score: number
	resources: Resource[]
	reasoning: string
}

export interface GeneratePlanResponse {
	allocations: Allocation[]
	message?: string // present when allocations is empty: "No unserved sites"
}

export interface ReplanRequest {
	center_id: number
	trigger: ReplanTrigger
}

export interface ReplanChange {
	site_id: number
	old_rank: number | null
	new_rank: number
	reason: string
}

export interface ReplanResponse {
	changed: ReplanChange[]
	unchanged: number[] // array of site IDs only
}

// ─── Roads ────────────────────────────────────────────────────────────────────

export interface ReportRoadDamageRequest {
	center_id: number
	lat: number
	lng: number
	reason?: string
}

export interface ReportRoadDamageResponse {
	id: number
	active: true
}

export interface DamagedRoad {
	id: number
	lat: number
	lng: number
	reason: string | null
	reported_at: string // ISO 8601
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export interface RouteResponse {
	distance_km: number
	eta_minutes: number
	geojson: GeoJSON.LineString
	avoided_damage: boolean
	delta_minutes_vs_direct: number
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

export interface CreateDispatchRequest {
	site_id: number
	depot_id: number
	resources: Resource[]
}

export interface DispatchRoute {
	geojson: GeoJSON.LineString
	distance_km: number
}

export interface CreateDispatchResponse {
	dispatch_id: number
	status: 'planned'
	route: DispatchRoute
	eta_minutes: number
}

export interface UpdateDispatchStatusRequest {
	status: 'en_route' | 'delivered'
}

export interface UpdateDispatchStatusResponse {
	dispatch_id: number
	status: DispatchStatus
}

// ─── Session (AuthContext shape) ──────────────────────────────────────────────

export interface Session {
	token: string
	role: Role
	center_id: number
	center_name: string
}

import { z } from 'zod'

// ─── Enum schemas (mirror API_CONTRACT.md exactly) ────────────────────────────

export const needsEnum = z.enum([
	'food',
	'water',
	'medical_evacuation',
	'shelter',
	'medicine',
	'general_evacuation',
])

export const urgencyFlagEnum = z.enum([
	// Structured / manual report flags
	'elderly_present',
	'children_present',
	'pregnancy',
	'injury_reported',
	'water_rising',
	'stranded_no_exit',
	// AI-extracted flags
	'mass_casualty',
	'critical_medical',
	'infrastructure_collapse',
	'flooding',
	'fire',
	'trapped_persons',
])

export const severityEnum = z.enum(['low', 'medium', 'high', 'critical'])

// ─── Screen 5 — Report Review ─────────────────────────────────────────────────
// lat/lng being required enforces the rule: never let an unmatched location
// get confirmed without coordinates. The schema blocks submission if they're missing.

export const reportReviewSchema = z.object({
	location_name: z.string().min(1, 'Location name is required'),
	lat: z.number({ required_error: 'Pin a location on the map first' }),
	lng: z.number({ required_error: 'Pin a location on the map first' }),
	estimated_population: z
		.number({ required_error: 'Population estimate is required' })
		.int('Must be a whole number')
		.positive('Must be greater than zero'),
	needs: z.array(needsEnum).min(1, 'Select at least one need'),
	urgency_flags: z.array(urgencyFlagEnum),
	status: z.enum(['confirmed', 'rejected']),
})

export type ReportReviewFormValues = z.infer<typeof reportReviewSchema>

// ─── Screen 6 — Manual Report Entry ──────────────────────────────────────────

export const manualReportSchema = z.object({
	location_name: z.string().min(1, 'Location is required'),
	headcount: z
		.number({ required_error: 'Headcount is required' })
		.int('Must be a whole number')
		.positive('Must be greater than zero'),
	severity: severityEnum,
	needs: z.array(needsEnum).min(1, 'Select at least one need'),
	contact_number: z.string().optional(),
})

export type ManualReportFormValues = z.infer<typeof manualReportSchema>

// ─── Screen 2 — Login ─────────────────────────────────────────────────────────

export const loginSchema = z.object({
	center_code: z.string().min(1, 'Center code is required'),
	username: z.string().min(1, 'Username is required'),
	password: z.string().min(1, 'Password is required'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

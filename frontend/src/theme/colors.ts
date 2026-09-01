// MADAD color palette — official brand colors
// Primary Dark: #464B71  | Primary Blue: #118AB2
// Secondary/Aqua: #7CD5C7 | Background/Off-white: #F2F2ED
//
// Urgency: red/orange/yellow — reserved ONLY for urgency badges/markers, never decoration
// Neutral: gray scale for text, borders, backgrounds

export const colors = {
	// ── Brand primaries ────────────────────────────────────────────────────────
	primary: '#118AB2', // Primary Blue — actions, links, interactive elements
	primaryLight: '#E6F5FB', // Tinted primary for light backgrounds / badges
	primaryDark: '#464B71', // Primary Dark — nav, headers, strong structural elements

	// ── Secondary / Aqua ───────────────────────────────────────────────────────
	secondary: '#7CD5C7', // Aqua — accents, positive/supportive states, highlights
	secondaryLight: '#E8F7F5', // Light tint of secondary

	// ── Background / Surface ───────────────────────────────────────────────────
	background: '#F2F2ED', // Off-white — main page backgrounds
	surface: '#FFFFFF', // Cards, inputs, sheet backgrounds
	surfaceElevated: '#FFFFFF',

	// ── Text ───────────────────────────────────────────────────────────────────
	textPrimary: '#1A1F36', // Near-black for primary text (good contrast on #F2F2ED)
	textSecondary: '#5A6070', // Muted secondary text
	textDisabled: '#9EA5B4',
	textInverse: '#FFFFFF',

	// ── Borders ────────────────────────────────────────────────────────────────
	border: '#DDE0E7',
	borderFocus: '#118AB2',

	// ── Urgency ────────────────────────────────────────────────────────────────
	// These MUST NOT be used for decoration — reserved strictly for urgency UI
	urgencyCritical: '#C62828', // deep red
	urgencyHigh: '#D84315', // deep orange
	urgencyMedium: '#E65100', // orange
	urgencyLow: '#F9A825', // amber

	// ── Severity (Manual Report Entry — segmented buttons) ─────────────────────
	severityCritical: '#C62828',
	severityHigh: '#D84315',
	severityMedium: '#E65100',
	severityLow: '#2E7D32',

	// ── Dispatch / status ──────────────────────────────────────────────────────
	statusPlanned: '#118AB2',
	statusEnRoute: '#E65100',
	statusDelivered: '#2E7D32',

	// ── Feedback ───────────────────────────────────────────────────────────────
	error: '#C62828',
	errorLight: '#FFEBEE',
	success: '#2E7D32',
	successLight: '#E8F5E9',
	warning: '#E65100',
	warningLight: '#FFF3E0',
	info: '#118AB2',
	infoLight: '#E6F5FB',

	// ── Neutral scale ──────────────────────────────────────────────────────────
	white: '#FFFFFF',
	gray100: '#F5F6F8',
	gray200: '#EBEDF2',
	gray300: '#D8DCE6',
	gray400: '#B0B7C3',
	gray500: '#8C95A6',
	gray600: '#6B7280',
	gray700: '#4B5563',
	gray800: '#374151',
	gray900: '#1F2937',
	black: '#000000',

	// ── AI suggestion indicator ────────────────────────────────────────────────
	aiSuggested: '#EEF0F9', // light tint of primaryDark
	aiSuggestedBorder: '#464B71', // primaryDark border
} as const

export type Colors = typeof colors

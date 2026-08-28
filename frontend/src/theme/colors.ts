// MADAD color palette
// Primary: calm teal/blue for navigation & buttons
// Urgency: red/orange/yellow — reserved ONLY for urgency indicators, never decoration
// Neutral: gray scale for text, borders, backgrounds

export const colors = {
	// Primary brand
	primary: '#1A7FBD',
	primaryLight: '#E6F4FE',
	primaryDark: '#135A8A',

	// Urgency — do not reuse these for anything other than urgency badges/markers
	urgencyCritical: '#D32F2F', // red
	urgencyHigh: '#E64A19', // deep orange
	urgencyMedium: '#F57C00', // orange
	urgencyLow: '#FBC02D', // amber/yellow

	// Severity (for Manual Report Entry segmented buttons)
	severityCritical: '#D32F2F',
	severityHigh: '#E64A19',
	severityMedium: '#F57C00',
	severityLow: '#388E3C',

	// Status
	statusPlanned: '#1565C0',
	statusEnRoute: '#F57C00',
	statusDelivered: '#388E3C',

	// Neutral scale
	white: '#FFFFFF',
	gray100: '#F5F5F5',
	gray200: '#EEEEEE',
	gray300: '#E0E0E0',
	gray400: '#BDBDBD',
	gray500: '#9E9E9E',
	gray600: '#757575',
	gray700: '#616161',
	gray800: '#424242',
	gray900: '#212121',
	black: '#000000',

	// Backgrounds
	background: '#F7FAFD',
	surface: '#FFFFFF',
	surfaceElevated: '#FFFFFF',

	// Text
	textPrimary: '#212121',
	textSecondary: '#616161',
	textDisabled: '#9E9E9E',
	textInverse: '#FFFFFF',

	// Borders
	border: '#E0E0E0',
	borderFocus: '#1A7FBD',

	// Feedback
	error: '#D32F2F',
	errorLight: '#FFEBEE',
	success: '#388E3C',
	successLight: '#E8F5E9',
	warning: '#F57C00',
	warningLight: '#FFF3E0',
	info: '#1565C0',
	infoLight: '#E3F2FD',

	// AI suggestion indicator
	aiSuggested: '#EDE7F6',
	aiSuggestedBorder: '#7E57C2',
} as const

export type Colors = typeof colors

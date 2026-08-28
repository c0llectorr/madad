// MADAD spacing scale (dp)
// Pick from this scale ONLY — never use arbitrary numbers like 15 or 22
// Screen margins: 20dp horizontal on every screen

export const spacing = {
	xs: 4,
	sm: 8,
	md: 12,
	base: 16,
	lg: 20, // standard horizontal screen margin
	xl: 24,
	xxl: 32,
	xxxl: 48,
} as const

export type Spacing = typeof spacing

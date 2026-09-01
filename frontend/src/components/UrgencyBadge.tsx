import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'
import { UrgencyFlag } from '../types'

interface Props {
	flags: UrgencyFlag[]
}

const FLAG_LABELS: Record<UrgencyFlag, string> = {
	// AI-extracted flags
	mass_casualty: 'Mass Casualty',
	critical_medical: 'Critical Medical',
	infrastructure_collapse: 'Infrastructure',
	flooding: 'Flooding',
	fire: 'Fire',
	trapped_persons: 'Trapped',
	// Structured / manual report flags
	elderly_present: 'Elderly',
	children_present: 'Children',
	pregnancy: 'Pregnancy',
	injury_reported: 'Injury',
	water_rising: 'Water Rising',
	stranded_no_exit: 'Stranded',
}

/**
 * Severity tier for sorting/colouring — higher number = higher urgency.
 * Ensures the most critical flags always appear first.
 */
const FLAG_TIER: Record<UrgencyFlag, number> = {
	mass_casualty: 4,
	critical_medical: 4,
	fire: 4,
	injury_reported: 4,
	pregnancy: 4,
	infrastructure_collapse: 3,
	flooding: 3,
	water_rising: 3,
	stranded_no_exit: 3,
	trapped_persons: 2,
	elderly_present: 1,
	children_present: 1,
}

const TIER_COLOR: Record<number, string> = {
	4: colors.urgencyCritical,
	3: colors.urgencyHigh,
	2: colors.urgencyMedium,
	1: colors.urgencyLow,
}

const TIER_LABEL: Record<number, string> = {
	4: 'CRITICAL',
	3: 'HIGH',
	2: 'MEDIUM',
	1: 'LOW',
}

/**
 * Urgency badge row.
 * Each badge shows the flag label (primary) and a severity tier indicator
 * so that critical state is never communicated by colour alone.
 */
export default function UrgencyBadge({ flags }: Props) {
	if (!flags.length) return null

	// Sort descending by tier so critical badges appear first
	const sorted = [...flags].sort(
		(a, b) => (FLAG_TIER[b] ?? 0) - (FLAG_TIER[a] ?? 0)
	)

	return (
		<View style={styles.row}>
			{sorted.map((flag) => {
				const tier = FLAG_TIER[flag] ?? 1
				const bgColor = TIER_COLOR[tier]
				return (
					<View
						key={flag}
						style={[
							styles.badge,
							{
								backgroundColor: bgColor + '22',
								borderColor: bgColor,
							},
						]}
						accessibilityRole="text"
						accessibilityLabel={`${TIER_LABEL[tier]}: ${FLAG_LABELS[flag]}`}
					>
						{/* Tier dot — visual indicator */}
						<View
							style={[
								styles.tierDot,
								{ backgroundColor: bgColor },
							]}
						/>
						{/* Label — always shown as text, never colour-only */}
						<Text style={[styles.label, { color: bgColor }]}>
							{FLAG_LABELS[flag]}
						</Text>
					</View>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
	},
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 8,
		borderWidth: 1,
		paddingHorizontal: spacing.sm,
		paddingVertical: 4,
		gap: 5,
	},
	tierDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	label: {
		...typography.caption,
		fontWeight: '700',
		fontSize: 12,
	},
})

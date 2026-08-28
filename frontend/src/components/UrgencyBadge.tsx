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

const FLAG_COLOR: Record<UrgencyFlag, string> = {
	// AI-extracted flags
	mass_casualty: colors.urgencyCritical,
	critical_medical: colors.urgencyCritical,
	infrastructure_collapse: colors.urgencyHigh,
	flooding: colors.urgencyHigh,
	fire: colors.urgencyCritical,
	trapped_persons: colors.urgencyMedium,
	// Structured / manual report flags
	elderly_present: colors.urgencyMedium,
	children_present: colors.urgencyMedium,
	pregnancy: colors.urgencyCritical,
	injury_reported: colors.urgencyCritical,
	water_rising: colors.urgencyHigh,
	stranded_no_exit: colors.urgencyHigh,
}

/** Urgency badge row — use only for urgency indicators, never decorative */
export default function UrgencyBadge({ flags }: Props) {
	if (!flags.length) return null
	return (
		<View style={styles.row}>
			{flags.map((flag) => (
				<View
					key={flag}
					style={[
						styles.badge,
						{ backgroundColor: FLAG_COLOR[flag] },
					]}
				>
					<Text style={styles.text}>{FLAG_LABELS[flag]}</Text>
				</View>
			))}
		</View>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
	badge: {
		borderRadius: 10,
		paddingHorizontal: spacing.sm,
		paddingVertical: 3,
	},
	text: { ...typography.caption, color: colors.white, fontWeight: '600' },
})

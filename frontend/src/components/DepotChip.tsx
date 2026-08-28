import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'
import { Depot } from '../types'

interface Props {
	depot: Depot
}

/** Compact depot summary chip for the Dashboard horizontal scroll strip */
export default function DepotChip({ depot }: Props) {
	const summary = depot.inventory
		.slice(0, 3)
		.map((r) => `${r.quantity} ${r.resource_type}`)
		.join(' · ')

	const overflow =
		depot.inventory.length > 3 ? ` +${depot.inventory.length - 3} more` : ''

	return (
		<View style={styles.chip}>
			<Text style={styles.name} numberOfLines={1}>
				{depot.name}
			</Text>
			<Text style={styles.summary} numberOfLines={2}>
				{summary}
				{overflow}
			</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	chip: {
		backgroundColor: colors.surface,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.base,
		minWidth: 160,
		maxWidth: 200,
	},
	name: {
		...typography.captionBold,
		color: colors.primary,
		marginBottom: spacing.xs,
	},
	summary: { ...typography.caption },
})

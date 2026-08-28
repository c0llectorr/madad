import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import UrgencyBadge from './UrgencyBadge'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'
import { Site } from '../types'

interface Props {
	site: Site
}

export default function SiteCard({ site }: Props) {
	return (
		<View style={styles.card}>
			<Text style={styles.name}>{site.location_name}</Text>
			<Text style={styles.population}>
				~{site.estimated_population.toLocaleString()} people
			</Text>
			<UrgencyBadge flags={site.urgency_flags} />
			<View style={styles.needs}>
				{site.needs.map((need) => (
					<View key={need} style={styles.needChip}>
						<Text style={styles.needText}>
							{need.replace('_', ' ')}
						</Text>
					</View>
				))}
			</View>
			<View style={styles.meta}>
				<Text style={styles.metaText}>
					Score: {(site.priority_score * 100).toFixed(0)}
				</Text>
				<Text style={styles.metaText}>
					{site.confidence === 'corroborated'
						? 'Corroborated'
						: 'Single source'}
				</Text>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: colors.surface,
		borderRadius: 10,
		padding: spacing.base,
		borderWidth: 1,
		borderColor: colors.border,
		gap: spacing.sm,
	},
	name: { ...typography.bodyBold },
	population: { ...typography.caption },
	needs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
	needChip: {
		backgroundColor: colors.gray200,
		borderRadius: 10,
		paddingHorizontal: spacing.sm,
		paddingVertical: 3,
	},
	needText: { ...typography.caption, textTransform: 'capitalize' },
	meta: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: spacing.xs,
	},
	metaText: { ...typography.caption, color: colors.textSecondary },
})

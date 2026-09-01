import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import UrgencyBadge from './UrgencyBadge'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'
import { Site, SiteStatus } from '../types'

interface Props {
	site: Site
}

const STATUS_CONFIG: Record<
	SiteStatus,
	{ label: string; bgColor: string; textColor: string }
> = {
	unserved: {
		label: 'Unserved',
		bgColor: colors.warningLight,
		textColor: colors.warning,
	},
	planned: {
		label: 'Planned',
		bgColor: colors.infoLight,
		textColor: colors.info,
	},
	dispatched: {
		label: 'Dispatched',
		bgColor: colors.primaryLight,
		textColor: colors.primary,
	},
	delivered: {
		label: 'Delivered',
		bgColor: colors.successLight,
		textColor: colors.success,
	},
}

export default function SiteCard({ site }: Props) {
	const statusConfig = STATUS_CONFIG[site.status] ?? STATUS_CONFIG.unserved
	const scorePercent = (site.priority_score * 100).toFixed(0)

	return (
		<View style={styles.card}>
			{/* ── Header: name + status ─────────────────────────────────── */}
			<View style={styles.header}>
				<Text style={styles.name} numberOfLines={2}>
					{site.location_name}
				</Text>
				<View
					style={[
						styles.statusBadge,
						{ backgroundColor: statusConfig.bgColor },
					]}
				>
					<Text
						style={[
							styles.statusText,
							{ color: statusConfig.textColor },
						]}
					>
						{statusConfig.label}
					</Text>
				</View>
			</View>

			{/* ── Population ────────────────────────────────────────────── */}
			<Text style={styles.population}>
				~{site.estimated_population.toLocaleString()} people affected
			</Text>

			{/* ── Urgency flags ─────────────────────────────────────────── */}
			{site.urgency_flags.length > 0 && (
				<UrgencyBadge flags={site.urgency_flags} />
			)}

			{/* ── Needs ─────────────────────────────────────────────────── */}
			{site.needs.length > 0 && (
				<View style={styles.needsRow}>
					{site.needs.map((need) => (
						<View key={need} style={styles.needChip}>
							<Text style={styles.needText}>
								{need.replace(/_/g, ' ')}
							</Text>
						</View>
					))}
				</View>
			)}

			{/* ── Meta: score + confidence ──────────────────────────────── */}
			<View style={styles.metaRow}>
				<View style={styles.scoreBlock}>
					<Text style={styles.metaLabel}>Priority Score</Text>
					<View style={styles.scoreBar}>
						<View
							style={[
								styles.scoreBarFill,
								{ width: `${scorePercent}%` as any },
							]}
						/>
					</View>
					<Text style={styles.scoreValue}>{scorePercent} / 100</Text>
				</View>
				<View style={styles.confidenceBlock}>
					<Text style={styles.metaLabel}>Confidence</Text>
					<Text style={styles.confidenceValue}>
						{site.confidence === 'corroborated'
							? 'Corroborated'
							: 'Single source'}
					</Text>
				</View>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: colors.surface,
		borderRadius: 12,
		padding: spacing.base,
		borderWidth: 1,
		borderColor: colors.border,
		gap: spacing.sm,
	},

	// ── Header ───────────────────────────────────────────────────────────────
	header: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		gap: spacing.sm,
	},
	name: {
		...typography.bodyBold,
		color: colors.textPrimary,
		flex: 1,
	},
	statusBadge: {
		borderRadius: 8,
		paddingHorizontal: spacing.sm,
		paddingVertical: 3,
		alignSelf: 'flex-start',
		flexShrink: 0,
	},
	statusText: {
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.2,
	},

	// ── Population ────────────────────────────────────────────────────────────
	population: {
		...typography.caption,
		color: colors.textSecondary,
	},

	// ── Needs ─────────────────────────────────────────────────────────────────
	needsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
	},
	needChip: {
		backgroundColor: colors.gray200,
		borderRadius: 8,
		paddingHorizontal: spacing.sm,
		paddingVertical: 3,
	},
	needText: {
		...typography.caption,
		textTransform: 'capitalize',
		color: colors.textPrimary,
	},

	// ── Meta ──────────────────────────────────────────────────────────────────
	metaRow: {
		flexDirection: 'row',
		gap: spacing.base,
		marginTop: spacing.xs,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		paddingTop: spacing.sm,
	},
	metaLabel: {
		...typography.caption,
		color: colors.textSecondary,
		textTransform: 'uppercase',
		letterSpacing: 0.4,
		fontSize: 10,
		marginBottom: 3,
	},
	scoreBlock: { flex: 1, gap: 4 },
	scoreBar: {
		height: 5,
		backgroundColor: colors.gray200,
		borderRadius: 3,
		overflow: 'hidden',
	},
	scoreBarFill: {
		height: '100%',
		backgroundColor: colors.primary,
		borderRadius: 3,
	},
	scoreValue: {
		...typography.caption,
		color: colors.primary,
		fontWeight: '600',
		fontSize: 11,
	},
	confidenceBlock: { flex: 1 },
	confidenceValue: {
		...typography.caption,
		color: colors.textPrimary,
		fontWeight: '600',
	},
})

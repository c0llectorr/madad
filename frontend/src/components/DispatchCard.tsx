import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'
import { CreateDispatchResponse, DispatchStatus } from '../types'

interface Props {
	dispatch: CreateDispatchResponse
}

const STATUS_LABEL: Record<DispatchStatus, string> = {
	planned: 'Planned',
	en_route: 'En Route',
	delivered: 'Delivered',
}

const STATUS_COLOR: Record<DispatchStatus, string> = {
	planned: colors.statusPlanned,
	en_route: colors.statusEnRoute,
	delivered: colors.statusDelivered,
}

export default function DispatchCard({ dispatch }: Props) {
	return (
		<View style={styles.card}>
			<View style={styles.header}>
				<Text style={styles.id}>Dispatch #{dispatch.dispatch_id}</Text>
				<View
					style={[
						styles.statusBadge,
						{ backgroundColor: STATUS_COLOR[dispatch.status] },
					]}
				>
					<Text style={styles.statusText}>
						{STATUS_LABEL[dispatch.status]}
					</Text>
				</View>
			</View>
			<View style={styles.row}>
				<Text style={styles.label}>ETA</Text>
				<Text style={styles.value}>{dispatch.eta_minutes} min</Text>
			</View>
			<View style={styles.row}>
				<Text style={styles.label}>Distance</Text>
				<Text style={styles.value}>
					{dispatch.route?.distance_km ?? '—'} km
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
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	id: { ...typography.bodyBold },
	statusBadge: {
		borderRadius: 10,
		paddingHorizontal: spacing.sm,
		paddingVertical: 3,
	},
	statusText: {
		...typography.caption,
		color: colors.white,
		fontWeight: '600',
	},
	row: { flexDirection: 'row', justifyContent: 'space-between' },
	label: { ...typography.caption },
	value: { ...typography.captionBold },
})

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'
import { Depot } from '../types'

interface Props {
	depot: Depot
}

/** Threshold below which a resource is considered low-stock */
const LOW_STOCK_THRESHOLD = 20

/** Compact depot summary chip for the Dashboard horizontal scroll strip */
export default function DepotChip({ depot }: Props) {
	const hasLowStock = depot.inventory.some(
		(r) => r.quantity <= LOW_STOCK_THRESHOLD
	)

	const displayItems = depot.inventory.slice(0, 3)
	const overflowCount =
		depot.inventory.length > 3 ? depot.inventory.length - 3 : 0

	return (
		<View style={[styles.chip, hasLowStock && styles.chipLowStock]}>
			{/* Depot name + low-stock indicator */}
			<View style={styles.chipHeader}>
				<Text style={styles.name} numberOfLines={1}>
					{depot.name}
				</Text>
				{hasLowStock && (
					<View
						style={styles.lowStockDot}
						accessibilityRole="text"
						accessibilityLabel="Low stock warning"
					/>
				)}
			</View>

			{/* Resource lines */}
			{displayItems.map((r) => {
				const isLow = r.quantity <= LOW_STOCK_THRESHOLD
				return (
					<View key={r.resource_type} style={styles.resourceRow}>
						<Text
							style={[
								styles.resourceText,
								isLow && styles.resourceLow,
							]}
							numberOfLines={1}
						>
							{r.quantity} {r.resource_type.replace(/_/g, ' ')}
						</Text>
						{isLow && <Text style={styles.lowTag}>Low</Text>}
					</View>
				)
			})}

			{overflowCount > 0 && (
				<Text style={styles.overflow}>+{overflowCount} more</Text>
			)}
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
		maxWidth: 210,
		gap: spacing.xs,
	},
	chipLowStock: {
		borderColor: colors.warning,
		borderWidth: 1.5,
	},

	chipHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: spacing.xs,
		marginBottom: 2,
	},
	name: {
		...typography.captionBold,
		color: colors.primaryDark,
		flex: 1,
	},
	lowStockDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: colors.warning,
		flexShrink: 0,
	},

	resourceRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: spacing.xs,
	},
	resourceText: {
		...typography.caption,
		color: colors.textSecondary,
		flex: 1,
		textTransform: 'capitalize',
	},
	resourceLow: {
		color: colors.warning,
	},
	lowTag: {
		fontSize: 10,
		fontWeight: '700',
		color: colors.warning,
		backgroundColor: colors.warningLight,
		borderRadius: 4,
		paddingHorizontal: 4,
		paddingVertical: 1,
	},

	overflow: {
		...typography.caption,
		color: colors.gray400,
		marginTop: 2,
	},
})

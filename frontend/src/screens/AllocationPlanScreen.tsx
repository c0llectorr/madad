import React, { useEffect, useCallback } from 'react'
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
} from 'react-native'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
	withDelay,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/AppNavigator'
import { useGeneratePlan, useReplan } from '../hooks/usePlan'
import { useCreateDispatch } from '../hooks/useDispatch'
import { useSites } from '../hooks/useSites'
import { useDepots } from '../hooks/useDepots'
import { useUIStore } from '../store/uiStore'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorInline from '../components/ErrorInline'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'
import { Allocation, Site } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'AllocationPlan'>

/** Map a 0–1 priority score to a colour band. */
function priorityColor(score: number): string {
	if (score >= 0.75) return colors.urgencyCritical
	if (score >= 0.5) return colors.urgencyHigh
	if (score >= 0.25) return colors.urgencyMedium
	return colors.urgencyLow
}

/** Map a 0–1 priority score to a human label. */
function priorityLabel(score: number): string {
	if (score >= 0.75) return 'Critical'
	if (score >= 0.5) return 'High'
	if (score >= 0.25) return 'Medium'
	return 'Low'
}

// ── Allocation row ────────────────────────────────────────────────────────────

function AllocationRow({
	item,
	site,
	onDispatch,
	isDispatching,
}: {
	item: Allocation
	site: Site | undefined
	onDispatch: (item: Allocation) => void
	isDispatching: boolean
}) {
	const changedIds = useUIStore((s) => s.replanChangedSiteIds)
	const isChanged = changedIds.includes(item.site_id)
	const highlight = useSharedValue(isChanged ? 1 : 0)

	useEffect(() => {
		if (isChanged) {
			highlight.value = withDelay(200, withTiming(0, { duration: 1400 }))
		}
	}, [isChanged, highlight])

	const animatedStyle = useAnimatedStyle(() => ({
		backgroundColor: `rgba(249, 168, 37, ${highlight.value * 0.28})`,
	}))

	const [expanded, setExpanded] = React.useState(false)

	const pColor = priorityColor(item.priority_score)
	const pLabel = priorityLabel(item.priority_score)
	const locationName = site?.location_name ?? `Site #${item.site_id}`

	return (
		<Animated.View style={[styles.row, animatedStyle]}>
			{/* Priority colour strip on left edge */}
			<View style={[styles.priorityStrip, { backgroundColor: pColor }]} />

			<View style={styles.rowInner}>
				{/* Header row */}
				<TouchableOpacity
					style={styles.rowHeader}
					onPress={() => setExpanded((v) => !v)}
					accessibilityRole="button"
					accessibilityLabel={`Rank ${item.rank}: ${locationName}. Priority ${pLabel}. Tap to ${expanded ? 'collapse' : 'expand'} reasoning.`}
					activeOpacity={0.7}
				>
					{/* Rank badge */}
					<View style={styles.rankBadge}>
						<Text style={styles.rankText}>{item.rank}</Text>
					</View>

					{/* Site info */}
					<View style={styles.rowInfo}>
						<Text style={styles.rowTitle} numberOfLines={1}>
							{locationName}
						</Text>
						<View style={styles.rowMeta}>
							{/* Priority pill */}
							<View
								style={[
									styles.priorityPill,
									{
										backgroundColor: pColor + '22',
										borderColor: pColor,
									},
								]}
							>
								<View
									style={[
										styles.priorityDot,
										{ backgroundColor: pColor },
									]}
								/>
								<Text
									style={[
										styles.priorityPillText,
										{ color: pColor },
									]}
								>
									{pLabel}
								</Text>
							</View>
							{/* Resource summary */}
							<Text
								style={styles.resourceSummary}
								numberOfLines={1}
							>
								{item.resources
									.map(
										(r) =>
											`${r.quantity}× ${r.resource_type}`
									)
									.join(', ')}
							</Text>
						</View>
					</View>

					{/* Expand indicator */}
					<Text style={styles.expandIndicator}>
						{expanded ? '▲' : '▼'}
					</Text>
				</TouchableOpacity>

				{/* Expanded reasoning */}
				{expanded && (
					<View style={styles.reasoning}>
						<Text style={styles.reasoningLabel}>AI Reasoning</Text>
						<Text style={styles.reasoningText}>
							{item.reasoning}
						</Text>
					</View>
				)}

				{/* Dispatch button */}
				<View style={styles.rowFooter}>
					<TouchableOpacity
						style={[
							styles.dispatchButton,
							isDispatching && styles.dispatchButtonDisabled,
						]}
						onPress={() => onDispatch(item)}
						disabled={isDispatching}
						accessibilityRole="button"
						accessibilityLabel={`Confirm dispatch to ${locationName}`}
					>
						{isDispatching ? (
							<ActivityIndicator
								color={colors.white}
								size="small"
							/>
						) : (
							<Text style={styles.dispatchButtonText}>
								Confirm Dispatch →
							</Text>
						)}
					</TouchableOpacity>
				</View>
			</View>
		</Animated.View>
	)
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AllocationPlanScreen({ navigation }: Props) {
	const generateMutation = useGeneratePlan()
	const replanMutation = useReplan()
	const dispatchMutation = useCreateDispatch()
	const sites = useSites()
	const depots = useDepots()
	const clearReplanChangedSiteIds = useUIStore(
		(s) => s.clearReplanChangedSiteIds
	)
	const [dispatchingId, setDispatchingId] = React.useState<number | null>(
		null
	)

	useEffect(() => {
		generateMutation.mutate()
		return () => clearReplanChangedSiteIds()
	}, [clearReplanChangedSiteIds, generateMutation])

	const handleDispatch = useCallback(
		async (item: Allocation) => {
			setDispatchingId(item.site_id)
			try {
				const result = await dispatchMutation.mutateAsync({
					site_id: item.site_id,
					depot_id: item.depot_id,
					resources: item.resources,
				})
				const site = sites.data?.find((s) => s.id === item.site_id)
				const depot = depots.data?.find((d) => d.id === item.depot_id)
				if (!site || !depot) {
					Alert.alert(
						'Heads Up',
						'Site or depot details not fully loaded — route map may not show markers.'
					)
				}
				navigation.navigate('DispatchDetail', {
					dispatch: result,
					site: site!,
					depot: depot!,
					resources: item.resources,
				})
			} catch (err: any) {
				const detail = err?.response?.data?.detail
				if (err?.response?.status === 409) {
					Alert.alert(
						'Insufficient Inventory',
						detail ??
							'One or more depots do not have enough resources for this dispatch.'
					)
				} else {
					Alert.alert(
						'Dispatch Failed',
						detail ?? 'Unable to create dispatch. Please try again.'
					)
				}
			} finally {
				setDispatchingId(null)
			}
		},
		[dispatchMutation, navigation, sites.data, depots.data]
	)

	const handleReplan = () => {
		replanMutation.mutate('new_report', {
			onSuccess: (data) => {
				const changedCount = data.changed.length
				if (changedCount === 0) {
					Alert.alert(
						'Plan Unchanged',
						'No changes — the current plan is already optimal.'
					)
				}
			},
			onError: (err: any) => {
				Alert.alert(
					'Replan Failed',
					err?.response?.data?.detail ??
						'Unable to replan. Please try again.'
				)
			},
		})
	}

	const allocations = generateMutation.data?.allocations ?? []
	const isEmpty =
		!generateMutation.isPending &&
		(generateMutation.data?.message === 'No unserved sites' ||
			allocations.length === 0)

	if (generateMutation.isPending) {
		return <LoadingSpinner />
	}

	return (
		<SafeAreaView style={styles.container} edges={['bottom']}>
			{generateMutation.isError && (
				<ErrorInline
					message="Could not load the allocation plan."
					onRetry={() => generateMutation.mutate()}
				/>
			)}

			{isEmpty ? (
				<View style={styles.emptyContainer}>
					<View style={styles.emptyIcon}>
						<View style={styles.emptyIconInner} />
					</View>
					<Text style={styles.emptyTitle}>All Clear</Text>
					<Text style={styles.emptyBody}>
						There are no unserved sites requiring allocation at this
						time.
					</Text>
				</View>
			) : (
				<FlatList
					data={allocations}
					keyExtractor={(item) => String(item.site_id)}
					renderItem={({ item }) => (
						<AllocationRow
							item={item}
							site={sites.data?.find(
								(s) => s.id === item.site_id
							)}
							onDispatch={handleDispatch}
							isDispatching={dispatchingId === item.site_id}
						/>
					)}
					contentContainerStyle={styles.list}
					ItemSeparatorComponent={() => (
						<View style={styles.separator} />
					)}
				/>
			)}

			{/* Replan footer */}
			<View style={styles.footer}>
				<View style={styles.footerInfo}>
					<Text style={styles.footerCount}>
						{allocations.length} site
						{allocations.length !== 1 ? 's' : ''} in plan
					</Text>
				</View>
				<TouchableOpacity
					style={[
						styles.replanButton,
						replanMutation.isPending && styles.replanButtonDisabled,
					]}
					onPress={handleReplan}
					disabled={replanMutation.isPending}
					accessibilityRole="button"
					accessibilityLabel="Refresh and replan allocations"
				>
					{replanMutation.isPending ? (
						<ActivityIndicator color={colors.white} size="small" />
					) : (
						<Text style={styles.replanButtonText}>↻ Replan</Text>
					)}
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.background },

	list: {
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.base,
		paddingBottom: spacing.sm,
	},
	separator: { height: spacing.sm },

	// ── Row ───────────────────────────────────────────────────────────────────
	row: {
		flexDirection: 'row',
		backgroundColor: colors.surface,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: 'hidden',
	},
	priorityStrip: {
		width: 5,
		alignSelf: 'stretch',
	},
	rowInner: {
		flex: 1,
	},
	rowHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: spacing.base,
		gap: spacing.base,
	},

	// Rank badge
	rankBadge: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: colors.primaryLight,
		borderWidth: 1.5,
		borderColor: colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
	},
	rankText: {
		...typography.captionBold,
		color: colors.primary,
		fontSize: 15,
	},

	// Info
	rowInfo: { flex: 1, gap: 4 },
	rowTitle: {
		...typography.bodyBold,
		color: colors.textPrimary,
	},
	rowMeta: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		flexWrap: 'wrap',
	},

	// Priority pill
	priorityPill: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 8,
		borderWidth: 1,
		paddingHorizontal: spacing.sm,
		paddingVertical: 2,
		gap: 4,
	},
	priorityDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	priorityPillText: {
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.2,
	},

	resourceSummary: {
		...typography.caption,
		color: colors.textSecondary,
		flex: 1,
	},

	expandIndicator: {
		...typography.caption,
		color: colors.gray400,
		flexShrink: 0,
	},

	// Reasoning
	reasoning: {
		marginHorizontal: spacing.base,
		marginBottom: spacing.base,
		backgroundColor: colors.aiSuggested,
		borderRadius: 8,
		padding: spacing.base,
		borderLeftWidth: 3,
		borderLeftColor: colors.aiSuggestedBorder,
	},
	reasoningLabel: {
		...typography.captionBold,
		color: colors.aiSuggestedBorder,
		marginBottom: spacing.xs,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	reasoningText: {
		...typography.caption,
		color: colors.textPrimary,
		lineHeight: 20,
	},

	// Dispatch button
	rowFooter: {
		paddingHorizontal: spacing.base,
		paddingBottom: spacing.base,
	},
	dispatchButton: {
		backgroundColor: colors.primary,
		borderRadius: 8,
		height: 42,
		alignItems: 'center',
		justifyContent: 'center',
	},
	dispatchButtonDisabled: { opacity: 0.45 },
	dispatchButtonText: {
		...typography.captionBold,
		color: colors.white,
		fontSize: 14,
	},

	// ── Empty ──────────────────────────────────────────────────────────────────
	emptyContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.xl,
	},
	emptyIcon: {
		width: 72,
		height: 72,
		borderRadius: 36,
		borderWidth: 2.5,
		borderColor: colors.secondary,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: spacing.xl,
	},
	emptyIconInner: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: colors.secondary,
		opacity: 0.55,
	},
	emptyTitle: {
		...typography.heading,
		color: colors.primaryDark,
		marginBottom: spacing.sm,
	},
	emptyBody: {
		...typography.body,
		color: colors.textSecondary,
		textAlign: 'center',
		lineHeight: 24,
	},

	// ── Footer ────────────────────────────────────────────────────────────────
	footer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.base,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		backgroundColor: colors.surface,
	},
	footerInfo: {},
	footerCount: {
		...typography.caption,
		color: colors.textSecondary,
	},
	replanButton: {
		backgroundColor: colors.primaryDark,
		borderRadius: 8,
		paddingHorizontal: spacing.lg,
		height: 42,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		gap: spacing.xs,
		minWidth: 110,
	},
	replanButtonDisabled: { opacity: 0.45 },
	replanButtonText: {
		...typography.captionBold,
		color: colors.white,
		fontSize: 14,
	},
})

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
import { Allocation } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'AllocationPlan'>

function AllocationRow({
	item,
	onDispatch,
	isDispatching,
}: {
	item: Allocation
	onDispatch: (item: Allocation) => void
	isDispatching: boolean
}) {
	const changedIds = useUIStore((s) => s.replanChangedSiteIds)
	const isChanged = changedIds.includes(item.site_id)
	const highlight = useSharedValue(isChanged ? 1 : 0)

	useEffect(() => {
		if (isChanged) {
			highlight.value = withDelay(200, withTiming(0, { duration: 1200 }))
		}
	}, [isChanged])

	const animatedStyle = useAnimatedStyle(() => ({
		backgroundColor: `rgba(251, 192, 45, ${highlight.value * 0.35})`, // amber highlight fade
	}))

	const [expanded, setExpanded] = React.useState(false)

	return (
		<Animated.View style={[styles.row, animatedStyle]}>
			<TouchableOpacity
				style={styles.rowHeader}
				onPress={() => setExpanded((v) => !v)}
				accessibilityRole="button"
				accessibilityLabel={`Allocation rank ${item.rank}, site ID ${item.site_id}`}
			>
				<Text style={styles.rank}>{item.rank}</Text>
				<View style={styles.rowInfo}>
					<Text style={styles.rowTitle}>Site #{item.site_id}</Text>
					<Text style={styles.rowScore}>
						Score: {(item.priority_score * 100).toFixed(0)}
					</Text>
					<Text style={styles.rowResources} numberOfLines={1}>
						{item.resources
							.map((r) => `${r.quantity}× ${r.resource_type}`)
							.join(', ')}
					</Text>
				</View>
				<TouchableOpacity
					style={[
						styles.dispatchButton,
						isDispatching && styles.dispatchButtonDisabled,
					]}
					onPress={() => onDispatch(item)}
					disabled={isDispatching}
					accessibilityRole="button"
					accessibilityLabel={`Confirm dispatch for site ${item.site_id}`}
				>
					{isDispatching ? (
						<ActivityIndicator color={colors.white} size="small" />
					) : (
						<Text style={styles.dispatchButtonText}>Dispatch</Text>
					)}
				</TouchableOpacity>
			</TouchableOpacity>

			{expanded && (
				<View style={styles.reasoning}>
					<Text style={styles.reasoningText}>{item.reasoning}</Text>
				</View>
			)}
		</Animated.View>
	)
}

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

	// Load plan on mount
	useEffect(() => {
		generateMutation.mutate()
		return () => clearReplanChangedSiteIds() // clear highlights on unmount
	}, [])

	const handleDispatch = useCallback(
		async (item: Allocation) => {
			setDispatchingId(item.site_id)
			try {
				const result = await dispatchMutation.mutateAsync({
					site_id: item.site_id,
					depot_id: item.depot_id,
					resources: item.resources,
				})
				// Find the matching site and depot so DispatchDetail can show markers
				const site = sites.data?.find((s) => s.id === item.site_id)
				const depot = depots.data?.find((d) => d.id === item.depot_id)
				if (!site || !depot) {
					// Data not loaded yet — navigate without markers rather than block
					Alert.alert(
						'Warning',
						'Site or depot data not yet loaded. Route will display without markers.'
					)
				}
				navigation.navigate('DispatchDetail', {
					dispatch: result,
					site: site!,
					depot: depot!,
				})
			} catch (err: any) {
				const detail = err?.response?.data?.detail
				Alert.alert(
					'Dispatch Failed',
					detail ?? 'Unable to create dispatch.'
				)
			} finally {
				setDispatchingId(null)
			}
		},
		[dispatchMutation, navigation, sites.data, depots.data]
	)

	const handleReplan = () => {
		replanMutation.mutate('new_report', {
			onError: (err: any) => {
				Alert.alert(
					'Replan Failed',
					err?.response?.data?.detail ?? 'Unable to replan.'
				)
			},
		})
	}

	const allocations = generateMutation.data?.allocations ?? []
	const isEmpty = generateMutation.data?.message === 'No unserved sites'

	if (generateMutation.isPending) return <LoadingSpinner />

	return (
		<SafeAreaView style={styles.container} edges={['bottom']}>
			{generateMutation.isError && (
				<ErrorInline
					message="Failed to load plan"
					onRetry={() => generateMutation.mutate()}
				/>
			)}

			{isEmpty ? (
				<View style={styles.emptyContainer}>
					<Text style={styles.emptyTitle}>All Clear</Text>
					<Text style={styles.emptyBody}>
						No unserved sites at this time.
					</Text>
				</View>
			) : (
				<FlatList
					data={allocations}
					keyExtractor={(item) => String(item.site_id)}
					renderItem={({ item }) => (
						<AllocationRow
							item={item}
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

			{/* Replan button */}
			<View style={styles.footer}>
				<TouchableOpacity
					style={[
						styles.replanButton,
						replanMutation.isPending && styles.replanButtonDisabled,
					]}
					onPress={handleReplan}
					disabled={replanMutation.isPending}
					accessibilityRole="button"
					accessibilityLabel="Replan allocations"
				>
					{replanMutation.isPending ? (
						<ActivityIndicator color={colors.white} />
					) : (
						<Text style={styles.replanButtonText}>Replan</Text>
					)}
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.background },
	list: { paddingHorizontal: spacing.lg, paddingVertical: spacing.base },
	separator: { height: spacing.sm },
	row: {
		backgroundColor: colors.surface,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: 'hidden',
	},
	rowHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: spacing.base,
		gap: spacing.base,
	},
	rank: {
		...typography.heading,
		color: colors.primary,
		width: 32,
		textAlign: 'center',
	},
	rowInfo: { flex: 1 },
	rowTitle: { ...typography.bodyBold },
	rowScore: { ...typography.caption },
	rowResources: { ...typography.caption, color: colors.textSecondary },
	dispatchButton: {
		backgroundColor: colors.primary,
		borderRadius: 6,
		paddingHorizontal: spacing.base,
		height: 36,
		minWidth: 80,
		alignItems: 'center',
		justifyContent: 'center',
	},
	dispatchButtonDisabled: { opacity: 0.5 },
	dispatchButtonText: { ...typography.captionBold, color: colors.white },
	reasoning: {
		paddingHorizontal: spacing.base,
		paddingBottom: spacing.base,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		backgroundColor: colors.gray100,
	},
	reasoningText: {
		...typography.caption,
		fontStyle: 'italic',
		marginTop: spacing.sm,
	},
	emptyContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: spacing.lg,
	},
	emptyTitle: {
		...typography.heading,
		color: colors.success,
		marginBottom: spacing.sm,
	},
	emptyBody: {
		...typography.body,
		color: colors.textSecondary,
		textAlign: 'center',
	},
	footer: {
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.base,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		backgroundColor: colors.surface,
	},
	replanButton: {
		backgroundColor: colors.primaryDark,
		borderRadius: 8,
		height: 48,
		alignItems: 'center',
		justifyContent: 'center',
	},
	replanButtonDisabled: { opacity: 0.5 },
	replanButtonText: { ...typography.bodyBold, color: colors.white },
})

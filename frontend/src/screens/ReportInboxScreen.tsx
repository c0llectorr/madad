import React, { useState } from 'react'
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
	RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/AppNavigator'
import { useReports, useExtractReport } from '../hooks/useReports'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorInline from '../components/ErrorInline'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'
import { ReportListItem } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'ReportInbox'>

/** Format an ISO timestamp to a human-readable relative or absolute string. */
function formatTimestamp(iso: string): string {
	const date = new Date(iso)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffMin = Math.floor(diffMs / 60_000)

	if (diffMin < 1) return 'Just now'
	if (diffMin < 60) return `${diffMin}m ago`
	const diffHr = Math.floor(diffMin / 60)
	if (diffHr < 24) return `${diffHr}h ago`
	// Older than 24 h — show date + time
	return date.toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

export default function ReportInboxScreen({ navigation }: Props) {
	const {
		data: reports,
		isLoading,
		isError,
		refetch,
		isRefetching,
	} = useReports('pending_extraction')
	const extractMutation = useExtractReport()
	const [processingId, setProcessingId] = useState<number | null>(null)

	const handleProcess = async (reportId: number) => {
		setProcessingId(reportId)
		try {
			const result = await extractMutation.mutateAsync(reportId)
			navigation.navigate('ReportReview', { extractResult: result })
		} catch (err: any) {
			if (err?.response?.status === 503) {
				Alert.alert(
					'AI Service Unavailable',
					'The extraction service is temporarily unavailable. Please try again in a moment.',
					[
						{
							text: 'Retry',
							onPress: () => handleProcess(reportId),
						},
						{ text: 'Cancel' },
					]
				)
			} else if (err?.response?.status === 409) {
				Alert.alert(
					'Already Processed',
					'This report has already been extracted. Refresh the list to see the latest status.'
				)
			} else {
				const detail = err?.response?.data?.detail
				Alert.alert(
					'Processing Failed',
					detail ?? 'Unable to process this report. Please try again.'
				)
			}
		} finally {
			setProcessingId(null)
		}
	}

	const renderItem = ({ item }: { item: ReportListItem }) => {
		const isProcessing = processingId === item.report_id
		const isOtherProcessing =
			processingId !== null && processingId !== item.report_id
		const hasText = !!item.raw_text

		return (
			<View
				style={[styles.row, isProcessing && styles.rowProcessing]}
				accessibilityRole="none"
			>
				{/* Source indicator strip */}
				<View
					style={[
						styles.sourceStrip,
						{
							backgroundColor: hasText
								? colors.primary
								: colors.secondary,
						},
					]}
				/>

				<View style={styles.rowBody}>
					{/* Text preview */}
					<Text style={styles.preview} numberOfLines={2}>
						{item.raw_text ?? '(Manual report — no raw text)'}
					</Text>

					{/* Metadata row */}
					<View style={styles.metaRow}>
						<View
							style={[
								styles.sourceTag,
								{
									backgroundColor: hasText
										? colors.primaryLight
										: colors.secondaryLight,
								},
							]}
						>
							<Text
								style={[
									styles.sourceTagText,
									{
										color: hasText
											? colors.primary
											: colors.primaryDark,
									},
								]}
							>
								{hasText ? 'Field report' : 'Manual entry'}
							</Text>
						</View>
						<Text style={styles.timestamp}>
							{formatTimestamp(item.created_at)}
						</Text>
					</View>
				</View>

				{/* Process button */}
				<TouchableOpacity
					style={[
						styles.processButton,
						(isProcessing || isOtherProcessing) &&
							styles.processButtonDisabled,
					]}
					onPress={() => handleProcess(item.report_id)}
					disabled={isProcessing || isOtherProcessing}
					accessibilityRole="button"
					accessibilityLabel={`Process report from ${formatTimestamp(item.created_at)}`}
					accessibilityHint="Runs AI extraction on this report"
				>
					{isProcessing ? (
						<ActivityIndicator color={colors.white} size="small" />
					) : (
						<Text style={styles.processButtonText}>Process</Text>
					)}
				</TouchableOpacity>
			</View>
		)
	}

	// Full-screen initial load
	if (isLoading) {
		return <LoadingSpinner />
	}

	return (
		<SafeAreaView style={styles.container} edges={['bottom']}>
			{isError && (
				<ErrorInline
					message="Could not load reports. Check your connection."
					onRetry={refetch}
				/>
			)}

			<FlatList
				data={reports}
				keyExtractor={(item) => String(item.report_id)}
				renderItem={renderItem}
				contentContainerStyle={
					!reports?.length ? styles.listEmpty : styles.list
				}
				ItemSeparatorComponent={() => <View style={styles.separator} />}
				refreshControl={
					<RefreshControl
						refreshing={isRefetching}
						onRefresh={refetch}
						tintColor={colors.primary}
						colors={[colors.primary]}
					/>
				}
				ListEmptyComponent={
					<View style={styles.emptyState}>
						<View style={styles.emptyIcon}>
							<View style={styles.emptyIconInner} />
						</View>
						<Text style={styles.emptyTitle}>
							No Pending Reports
						</Text>
						<Text style={styles.emptyBody}>
							All incoming reports have been reviewed.{'\n'}
							Pull down to refresh.
						</Text>
					</View>
				}
			/>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.background },

	list: {
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.base,
	},
	listEmpty: {
		flex: 1,
		paddingHorizontal: spacing.lg,
	},

	// ── Row ───────────────────────────────────────────────────────────────────
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: 'hidden',
		minHeight: 72,
	},
	rowProcessing: {
		borderColor: colors.primary,
		backgroundColor: colors.primaryLight,
	},

	// Coloured left strip indicates source type
	sourceStrip: {
		width: 4,
		alignSelf: 'stretch',
	},

	rowBody: {
		flex: 1,
		paddingVertical: spacing.base,
		paddingLeft: spacing.base,
		paddingRight: spacing.sm,
		gap: spacing.sm,
	},
	preview: {
		...typography.body,
		color: colors.textPrimary,
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
	},
	sourceTag: {
		borderRadius: 6,
		paddingHorizontal: spacing.sm,
		paddingVertical: 2,
	},
	sourceTagText: {
		fontSize: 11,
		fontWeight: '600',
		letterSpacing: 0.3,
	},
	timestamp: {
		...typography.caption,
		color: colors.textSecondary,
	},

	// ── Process button ────────────────────────────────────────────────────────
	processButton: {
		backgroundColor: colors.primary,
		borderRadius: 8,
		marginRight: spacing.base,
		paddingHorizontal: spacing.base,
		height: 40,
		minWidth: 84,
		alignItems: 'center',
		justifyContent: 'center',
	},
	processButtonDisabled: { opacity: 0.4 },
	processButtonText: {
		...typography.captionBold,
		color: colors.white,
		fontSize: 14,
	},

	separator: { height: spacing.sm },

	// ── Empty state ───────────────────────────────────────────────────────────
	emptyState: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.xl,
	},
	emptyIcon: {
		width: 64,
		height: 64,
		borderRadius: 32,
		borderWidth: 2.5,
		borderColor: colors.secondary,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: spacing.xl,
	},
	emptyIconInner: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: colors.secondary,
		opacity: 0.5,
	},
	emptyTitle: {
		...typography.heading,
		color: colors.primaryDark,
		marginBottom: spacing.sm,
		textAlign: 'center',
	},
	emptyBody: {
		...typography.body,
		color: colors.textSecondary,
		textAlign: 'center',
		lineHeight: 24,
	},
})

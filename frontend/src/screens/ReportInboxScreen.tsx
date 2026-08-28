import React, { useState } from 'react'
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
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

export default function ReportInboxScreen({ navigation }: Props) {
	const {
		data: reports,
		isLoading,
		isError,
		refetch,
	} = useReports('pending_extraction')
	const extractMutation = useExtractReport()
	const [processingId, setProcessingId] = useState<number | null>(null)

	const handleProcess = async (reportId: number) => {
		setProcessingId(reportId)
		try {
			const result = await extractMutation.mutateAsync(reportId)
			navigation.navigate('ReportReview', { extractResult: result })
		} catch (err: any) {
			const detail = err?.response?.data?.detail
			if (err?.response?.status === 503) {
				Alert.alert(
					'Extraction Unavailable',
					'The AI extraction service is currently unavailable. Please try again.',
					[
						{
							text: 'Retry',
							onPress: () => handleProcess(reportId),
						},
						{ text: 'Cancel' },
					]
				)
			} else {
				Alert.alert(
					'Error',
					detail ?? 'Failed to process report. Please try again.'
				)
			}
		} finally {
			setProcessingId(null)
		}
	}

	const renderItem = ({ item }: { item: ReportListItem }) => {
		const isProcessing = processingId === item.report_id
		return (
			<View style={styles.row}>
				<View style={styles.rowText}>
					<Text style={styles.preview} numberOfLines={2}>
						{item.raw_text ?? '(Manual report — no raw text)'}
					</Text>
					<Text style={styles.timestamp}>
						{new Date(item.created_at).toLocaleString()}
					</Text>
				</View>
				<TouchableOpacity
					style={[
						styles.processButton,
						isProcessing && styles.processButtonDisabled,
					]}
					onPress={() => handleProcess(item.report_id)}
					disabled={isProcessing || processingId !== null}
					accessibilityRole="button"
					accessibilityLabel={`Process report ${item.report_id}`}
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

	if (isLoading) return <LoadingSpinner />

	return (
		<SafeAreaView style={styles.container} edges={['bottom']}>
			{isError && (
				<ErrorInline
					message="Failed to load reports"
					onRetry={refetch}
				/>
			)}
			<FlatList
				data={reports}
				keyExtractor={(item) => String(item.report_id)}
				renderItem={renderItem}
				contentContainerStyle={styles.list}
				ItemSeparatorComponent={() => <View style={styles.separator} />}
				ListEmptyComponent={
					<Text style={styles.emptyText}>No pending reports</Text>
				}
			/>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.background },
	list: { paddingHorizontal: spacing.lg, paddingVertical: spacing.base },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderRadius: 8,
		padding: spacing.base,
		gap: spacing.base,
		borderWidth: 1,
		borderColor: colors.border,
	},
	rowText: { flex: 1 },
	preview: { ...typography.body },
	timestamp: { ...typography.caption, marginTop: spacing.xs },
	processButton: {
		backgroundColor: colors.primary,
		borderRadius: 6,
		paddingHorizontal: spacing.base,
		height: 36,
		minWidth: 80,
		alignItems: 'center',
		justifyContent: 'center',
	},
	processButtonDisabled: { opacity: 0.5 },
	processButtonText: { ...typography.captionBold, color: colors.white },
	separator: { height: spacing.sm },
	emptyText: {
		...typography.body,
		color: colors.textSecondary,
		textAlign: 'center',
		marginTop: spacing.xxl,
	},
})

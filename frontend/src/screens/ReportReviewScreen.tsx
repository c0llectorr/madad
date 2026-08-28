import React, { useEffect } from 'react'
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	TextInput,
	Alert,
	ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/AppNavigator'
import { useConfirmReport } from '../hooks/useReports'
import {
	reportReviewSchema,
	ReportReviewFormValues,
} from '../validation/schemas'
import MultiSelectChips from '../components/MultiSelectChips'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'
import { NeedType, UrgencyFlag } from '../types'

const NEEDS_OPTIONS: NeedType[] = [
	'food',
	'water',
	'medical_evacuation',
	'shelter',
	'medicine',
	'general_evacuation',
]
const URGENCY_OPTIONS: UrgencyFlag[] = [
	'mass_casualty',
	'critical_medical',
	'infrastructure_collapse',
	'flooding',
	'fire',
	'trapped_persons',
]

type Props = NativeStackScreenProps<RootStackParamList, 'ReportReview'>

export default function ReportReviewScreen({ route, navigation }: Props) {
	const { extractResult } = route.params
	const { extracted, geocode_status, report_id } = extractResult
	const confirmMutation = useConfirmReport()

	const {
		control,
		handleSubmit,
		setValue,
		watch,
		formState: { errors, isValid },
	} = useForm<ReportReviewFormValues>({
		resolver: zodResolver(reportReviewSchema),
		defaultValues: {
			location_name: extracted.location_name,
			lat: geocode_status === 'matched' ? 33.6844 : undefined, // placeholder if matched
			lng: geocode_status === 'matched' ? 73.0479 : undefined,
			estimated_population: extracted.estimated_population,
			needs: extracted.needs,
			urgency_flags: extracted.urgency_flags,
			status: 'confirmed',
		},
		mode: 'onChange',
	})

	const onConfirm = async (values: ReportReviewFormValues) => {
		try {
			await confirmMutation.mutateAsync({
				reportId: report_id,
				data: values,
			})
			navigation.navigate('Dashboard')
		} catch (err: any) {
			Alert.alert(
				'Error',
				err?.response?.data?.detail ?? 'Failed to confirm report.'
			)
		}
	}

	const onDiscard = async () => {
		Alert.alert('Discard Report', 'Mark this report as rejected?', [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Discard',
				style: 'destructive',
				onPress: async () => {
					try {
						await confirmMutation.mutateAsync({
							reportId: report_id,
							data: { ...watch(), status: 'rejected' },
						})
						navigation.navigate('ReportInbox')
					} catch {
						Alert.alert('Error', 'Failed to discard report.')
					}
				},
			},
		])
	}

	const isPending = confirmMutation.isPending

	return (
		<SafeAreaView style={styles.container} edges={['bottom']}>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps="handled"
			>
				{/* Confidence badge */}
				<View style={styles.confidenceBadge}>
					<Text style={styles.confidenceText}>
						AI Suggested ·{' '}
						{extracted.confidence === 'corroborated'
							? 'Corroborated'
							: 'Single source'}
					</Text>
				</View>

				{geocode_status === 'unmatched' && (
					<View style={styles.unmatchedBanner}>
						<Text style={styles.unmatchedText}>
							Location not matched — drop a pin on the map to set
							coordinates before confirming.
						</Text>
						{/* TODO: embed MapView with draggable pin here and call setValue('lat'/'lng') */}
					</View>
				)}

				{/* Location name */}
				<Text style={styles.fieldLabel}>Location Name</Text>
				<View style={styles.aiField}>
					<Controller
						control={control}
						name="location_name"
						render={({ field: { onChange, value, onBlur } }) => (
							<TextInput
								style={[
									styles.input,
									errors.location_name && styles.inputError,
								]}
								value={value}
								onChangeText={onChange}
								onBlur={onBlur}
								accessibilityLabel="Location name"
							/>
						)}
					/>
				</View>
				{errors.location_name && (
					<Text style={styles.errorText}>
						{errors.location_name.message}
					</Text>
				)}

				{/* Estimated population */}
				<Text style={styles.fieldLabel}>Estimated Population</Text>
				<View style={styles.aiField}>
					<Controller
						control={control}
						name="estimated_population"
						render={({ field: { onChange, value, onBlur } }) => (
							<TextInput
								style={[
									styles.input,
									errors.estimated_population &&
										styles.inputError,
								]}
								value={value ? String(value) : ''}
								onChangeText={(t) =>
									onChange(t ? parseInt(t, 10) : 0)
								}
								onBlur={onBlur}
								keyboardType="numeric"
								accessibilityLabel="Estimated population"
							/>
						)}
					/>
				</View>
				{errors.estimated_population && (
					<Text style={styles.errorText}>
						{errors.estimated_population.message}
					</Text>
				)}

				{/* Needs */}
				<Text style={styles.fieldLabel}>Needs</Text>
				<Controller
					control={control}
					name="needs"
					render={({ field: { onChange, value } }) => (
						<MultiSelectChips
							options={NEEDS_OPTIONS}
							selected={value}
							onToggle={(opt) => {
								const next = value.includes(opt as NeedType)
									? value.filter((v) => v !== opt)
									: [...value, opt as NeedType]
								onChange(next)
							}}
						/>
					)}
				/>
				{errors.needs && (
					<Text style={styles.errorText}>{errors.needs.message}</Text>
				)}

				{/* Urgency flags */}
				<Text style={styles.fieldLabel}>Urgency Flags</Text>
				<Controller
					control={control}
					name="urgency_flags"
					render={({ field: { onChange, value } }) => (
						<MultiSelectChips
							options={URGENCY_OPTIONS}
							selected={value}
							onToggle={(opt) => {
								const next = value.includes(opt as UrgencyFlag)
									? value.filter((v) => v !== opt)
									: [...value, opt as UrgencyFlag]
								onChange(next)
							}}
							accentColor={colors.urgencyCritical}
						/>
					)}
				/>
			</ScrollView>

			{/* Action buttons */}
			<View style={styles.actions}>
				<TouchableOpacity
					style={styles.ghostButton}
					onPress={onDiscard}
					disabled={isPending}
					accessibilityRole="button"
					accessibilityLabel="Discard report"
				>
					<Text style={styles.ghostButtonText}>Discard</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[
						styles.confirmButton,
						(!isValid || isPending) && styles.confirmButtonDisabled,
					]}
					onPress={handleSubmit(onConfirm)}
					disabled={!isValid || isPending}
					accessibilityRole="button"
					accessibilityLabel="Confirm report"
				>
					{isPending ? (
						<ActivityIndicator color={colors.white} />
					) : (
						<Text style={styles.confirmButtonText}>Confirm</Text>
					)}
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.background },
	scrollContent: {
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.base,
		paddingBottom: spacing.xxxl,
	},
	confidenceBadge: {
		alignSelf: 'flex-start',
		backgroundColor: colors.aiSuggested,
		borderWidth: 1,
		borderColor: colors.aiSuggestedBorder,
		borderRadius: 12,
		paddingHorizontal: spacing.base,
		paddingVertical: spacing.xs,
		marginBottom: spacing.base,
	},
	confidenceText: { ...typography.caption, color: colors.aiSuggestedBorder },
	unmatchedBanner: {
		backgroundColor: colors.warningLight,
		borderRadius: 8,
		padding: spacing.base,
		marginBottom: spacing.base,
		borderWidth: 1,
		borderColor: colors.warning,
	},
	unmatchedText: { ...typography.caption, color: colors.warning },
	fieldLabel: {
		...typography.captionBold,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginTop: spacing.base,
		marginBottom: spacing.xs,
		color: colors.textSecondary,
	},
	aiField: {
		borderWidth: 1,
		borderColor: colors.aiSuggestedBorder,
		borderRadius: 8,
		backgroundColor: colors.aiSuggested,
	},
	input: {
		paddingHorizontal: spacing.base,
		height: 48,
		...typography.body,
	},
	inputError: { borderColor: colors.error },
	errorText: {
		...typography.caption,
		color: colors.error,
		marginTop: spacing.xs,
	},
	actions: {
		flexDirection: 'row',
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.base,
		gap: spacing.base,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		backgroundColor: colors.surface,
	},
	ghostButton: {
		flex: 1,
		height: 48,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: 'center',
		justifyContent: 'center',
	},
	ghostButtonText: { ...typography.bodyBold, color: colors.textSecondary },
	confirmButton: {
		flex: 2,
		height: 48,
		borderRadius: 8,
		backgroundColor: colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	confirmButtonDisabled: { opacity: 0.5 },
	confirmButtonText: { ...typography.bodyBold, color: colors.white },
})

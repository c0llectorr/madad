import React from 'react'
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
	'elderly_present',
	'children_present',
	'pregnancy',
	'injury_reported',
	'water_rising',
	'stranded_no_exit',
	'mass_casualty',
	'critical_medical',
	'infrastructure_collapse',
	'flooding',
	'fire',
	'trapped_persons',
]

// Rajanpur region fallback when geocoder returns no match
const RAJANPUR_CENTER = { lat: 29.1044, lng: 70.3301 }

type Props = NativeStackScreenProps<RootStackParamList, 'ReportReview'>

export default function ReportReviewScreen({ route, navigation }: Props) {
	const { extractResult } = route.params
	const {
		extracted,
		geocode_status,
		report_id,
		lat: geoLat,
		lng: geoLng,
	} = extractResult
	const confirmMutation = useConfirmReport()

	const defaultLat =
		geocode_status === 'matched' && geoLat != null ? geoLat : undefined
	const defaultLng =
		geocode_status === 'matched' && geoLng != null ? geoLng : undefined

	const {
		control,
		handleSubmit,
		watch,
		formState: { errors, isValid },
	} = useForm<ReportReviewFormValues>({
		resolver: zodResolver(reportReviewSchema),
		defaultValues: {
			location_name: extracted.location_name,
			lat: defaultLat,
			lng: defaultLng,
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
				'Could Not Confirm Report',
				err?.response?.data?.detail ??
					'Something went wrong. Please try again.'
			)
		}
	}

	const onDiscard = async () => {
		Alert.alert(
			'Discard This Report?',
			'This will mark the report as rejected. It cannot be undone.',
			[
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
							Alert.alert(
								'Error',
								'Could not discard the report. Please try again.'
							)
						}
					},
				},
			]
		)
	}

	const isPending = confirmMutation.isPending

	return (
		<SafeAreaView style={styles.container} edges={['bottom']}>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{/* ── AI suggestion banner ──────────────────────────────── */}
				<View style={styles.aiBanner}>
					<View style={styles.aiBannerLeft}>
						<View style={styles.aiDot} />
						<View>
							<Text style={styles.aiBannerTitle}>
								AI-Assisted Extraction
							</Text>
							<Text style={styles.aiBannerBody}>
								{extracted.confidence === 'corroborated'
									? 'Corroborated by multiple sources — review and confirm.'
									: 'From a single source — please verify each field carefully.'}
							</Text>
						</View>
					</View>
					<View
						style={[
							styles.confidencePill,
							extracted.confidence === 'corroborated'
								? styles.confidencePillGood
								: styles.confidencePillWeak,
						]}
					>
						<Text
							style={[
								styles.confidencePillText,
								extracted.confidence === 'corroborated'
									? styles.confidencePillTextGood
									: styles.confidencePillTextWeak,
							]}
						>
							{extracted.confidence === 'corroborated'
								? 'Corroborated'
								: 'Unverified'}
						</Text>
					</View>
				</View>

				{/* ── Unmatched location warning ────────────────────────── */}
				{geocode_status === 'unmatched' && (
					<View style={styles.unmatchedBanner}>
						<Text style={styles.unmatchedTitle}>
							⚠ Location Not Found
						</Text>
						<Text style={styles.unmatchedBody}>
							The AI could not match this location on the map.
							Enter the coordinates manually before confirming.
							(Rajanpur region: ~29.10, 70.33)
						</Text>
					</View>
				)}

				{/* Matched geocode confirmation */}
				{geocode_status === 'matched' &&
					geoLat != null &&
					geoLng != null && (
						<View style={styles.matchedBanner}>
							<Text style={styles.matchedText}>
								✓ Location matched — {geoLat.toFixed(4)},{' '}
								{geoLng.toFixed(4)}
							</Text>
						</View>
					)}

				{/* ── Coordinates (unmatched only) ──────────────────────── */}
				{geocode_status === 'unmatched' && (
					<View style={styles.coordRow}>
						<View style={styles.coordField}>
							<Text style={styles.fieldLabel}>
								Latitude <Text style={styles.required}>*</Text>
							</Text>
							<Controller
								control={control}
								name="lat"
								render={({
									field: { onChange, value, onBlur },
								}) => (
									<TextInput
										style={[
											styles.input,
											errors.lat && styles.inputError,
										]}
										value={
											value != null ? String(value) : ''
										}
										onChangeText={(t) =>
											onChange(
												t ? parseFloat(t) : undefined
											)
										}
										onBlur={onBlur}
										keyboardType="decimal-pad"
										placeholder={String(
											RAJANPUR_CENTER.lat
										)}
										placeholderTextColor={colors.gray400}
										accessibilityLabel="Latitude"
									/>
								)}
							/>
							{errors.lat && (
								<Text style={styles.errorText}>
									{errors.lat.message}
								</Text>
							)}
						</View>
						<View style={styles.coordField}>
							<Text style={styles.fieldLabel}>
								Longitude <Text style={styles.required}>*</Text>
							</Text>
							<Controller
								control={control}
								name="lng"
								render={({
									field: { onChange, value, onBlur },
								}) => (
									<TextInput
										style={[
											styles.input,
											errors.lng && styles.inputError,
										]}
										value={
											value != null ? String(value) : ''
										}
										onChangeText={(t) =>
											onChange(
												t ? parseFloat(t) : undefined
											)
										}
										onBlur={onBlur}
										keyboardType="decimal-pad"
										placeholder={String(
											RAJANPUR_CENTER.lng
										)}
										placeholderTextColor={colors.gray400}
										accessibilityLabel="Longitude"
									/>
								)}
							/>
							{errors.lng && (
								<Text style={styles.errorText}>
									{errors.lng.message}
								</Text>
							)}
						</View>
					</View>
				)}

				{/* ── Location name ──────────────────────────────────────── */}
				<Text style={styles.fieldLabel}>Location Name</Text>
				<View style={styles.aiField}>
					<Controller
						control={control}
						name="location_name"
						render={({ field: { onChange, value, onBlur } }) => (
							<TextInput
								style={[
									styles.input,
									styles.aiFieldInput,
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

				{/* ── Estimated population ──────────────────────────────── */}
				<Text style={styles.fieldLabel}>Estimated Population</Text>
				<View style={styles.aiField}>
					<Controller
						control={control}
						name="estimated_population"
						render={({ field: { onChange, value, onBlur } }) => (
							<TextInput
								style={[
									styles.input,
									styles.aiFieldInput,
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

				{/* ── Needs ─────────────────────────────────────────────── */}
				<Text style={styles.fieldLabel}>Needs</Text>
				<View style={styles.aiChipsWrapper}>
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
				</View>
				{errors.needs && (
					<Text style={styles.errorText}>{errors.needs.message}</Text>
				)}

				{/* ── Urgency flags ─────────────────────────────────────── */}
				<Text style={styles.fieldLabel}>Urgency Flags</Text>
				<View style={styles.aiChipsWrapper}>
					<Controller
						control={control}
						name="urgency_flags"
						render={({ field: { onChange, value } }) => (
							<MultiSelectChips
								options={URGENCY_OPTIONS}
								selected={value}
								onToggle={(opt) => {
									const next = value.includes(
										opt as UrgencyFlag
									)
										? value.filter((v) => v !== opt)
										: [...value, opt as UrgencyFlag]
									onChange(next)
								}}
								accentColor={colors.urgencyCritical}
							/>
						)}
					/>
				</View>
			</ScrollView>

			{/* ── Action footer ──────────────────────────────────────────── */}
			<View style={styles.footer}>
				<TouchableOpacity
					style={styles.discardButton}
					onPress={onDiscard}
					disabled={isPending}
					accessibilityRole="button"
					accessibilityLabel="Discard this report"
				>
					<Text style={styles.discardButtonText}>Discard</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[
						styles.confirmButton,
						(!isValid || isPending) && styles.confirmButtonDisabled,
					]}
					onPress={handleSubmit(onConfirm)}
					disabled={!isValid || isPending}
					accessibilityRole="button"
					accessibilityLabel="Confirm and save report"
				>
					{isPending ? (
						<ActivityIndicator color={colors.white} />
					) : (
						<Text style={styles.confirmButtonText}>
							Confirm Report
						</Text>
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

	// ── AI banner ─────────────────────────────────────────────────────────────
	aiBanner: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		backgroundColor: colors.aiSuggested,
		borderWidth: 1,
		borderColor: colors.aiSuggestedBorder,
		borderRadius: 10,
		padding: spacing.base,
		marginBottom: spacing.base,
		gap: spacing.sm,
	},
	aiBannerLeft: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: spacing.sm,
		flex: 1,
	},
	aiDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: colors.aiSuggestedBorder,
		marginTop: 4,
	},
	aiBannerTitle: {
		...typography.captionBold,
		color: colors.aiSuggestedBorder,
		marginBottom: 2,
	},
	aiBannerBody: {
		...typography.caption,
		color: colors.textSecondary,
		lineHeight: 18,
	},
	confidencePill: {
		borderRadius: 10,
		paddingHorizontal: spacing.sm,
		paddingVertical: 3,
		alignSelf: 'flex-start',
	},
	confidencePillGood: { backgroundColor: colors.successLight },
	confidencePillWeak: { backgroundColor: colors.warningLight },
	confidencePillText: { fontSize: 11, fontWeight: '700' },
	confidencePillTextGood: { color: colors.success },
	confidencePillTextWeak: { color: colors.warning },

	// ── Location banners ──────────────────────────────────────────────────────
	unmatchedBanner: {
		backgroundColor: colors.warningLight,
		borderRadius: 10,
		padding: spacing.base,
		marginBottom: spacing.base,
		borderWidth: 1,
		borderColor: colors.warning,
	},
	unmatchedTitle: {
		...typography.captionBold,
		color: colors.warning,
		marginBottom: spacing.xs,
	},
	unmatchedBody: {
		...typography.caption,
		color: colors.textPrimary,
		lineHeight: 18,
	},
	matchedBanner: {
		backgroundColor: colors.successLight,
		borderRadius: 8,
		paddingHorizontal: spacing.base,
		paddingVertical: spacing.sm,
		marginBottom: spacing.base,
		borderWidth: 1,
		borderColor: colors.success,
	},
	matchedText: {
		...typography.caption,
		color: colors.success,
		fontWeight: '600',
	},

	// ── Coordinates row ───────────────────────────────────────────────────────
	coordRow: {
		flexDirection: 'row',
		gap: spacing.base,
	},
	coordField: { flex: 1 },

	// ── Fields ────────────────────────────────────────────────────────────────
	fieldLabel: {
		...typography.captionBold,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginTop: spacing.base,
		marginBottom: spacing.xs,
		color: colors.textSecondary,
	},
	required: { color: colors.error },

	// AI-suggested fields have a distinct left border + tinted background
	aiField: {
		borderWidth: 1.5,
		borderColor: colors.aiSuggestedBorder,
		borderRadius: 8,
		backgroundColor: colors.aiSuggested,
		overflow: 'hidden',
	},
	aiFieldInput: {
		backgroundColor: 'transparent',
		borderWidth: 0,
	},
	// AI chips wrapper — same tinted treatment as text fields
	aiChipsWrapper: {
		borderWidth: 1.5,
		borderColor: colors.aiSuggestedBorder,
		borderRadius: 8,
		backgroundColor: colors.aiSuggested,
		padding: spacing.sm,
	},
	input: {
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 8,
		paddingHorizontal: spacing.base,
		height: 48,
		...typography.body,
		backgroundColor: colors.surface,
		color: colors.textPrimary,
	},
	inputError: {
		borderColor: colors.error,
		backgroundColor: colors.errorLight,
	},
	errorText: {
		...typography.caption,
		color: colors.error,
		marginTop: spacing.xs,
	},

	// ── Footer ────────────────────────────────────────────────────────────────
	footer: {
		flexDirection: 'row',
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.base,
		gap: spacing.base,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		backgroundColor: colors.surface,
	},
	discardButton: {
		flex: 1,
		height: 50,
		borderRadius: 10,
		borderWidth: 1.5,
		borderColor: colors.border,
		alignItems: 'center',
		justifyContent: 'center',
	},
	discardButtonText: {
		...typography.bodyBold,
		color: colors.textSecondary,
	},
	confirmButton: {
		flex: 2,
		height: 50,
		borderRadius: 10,
		backgroundColor: colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	confirmButtonDisabled: { opacity: 0.45 },
	confirmButtonText: {
		...typography.bodyBold,
		color: colors.white,
	},
})

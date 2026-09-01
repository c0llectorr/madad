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
import { useCreateReport } from '../hooks/useReports'
import {
	manualReportSchema,
	ManualReportFormValues,
} from '../validation/schemas'
import { useAuth } from '../context/AuthContext'
import MultiSelectChips from '../components/MultiSelectChips'
import SeveritySegment from '../components/SeveritySegment'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'
import { NeedType, Severity } from '../types'

const NEEDS_OPTIONS: NeedType[] = [
	'food',
	'water',
	'medical_evacuation',
	'shelter',
	'medicine',
	'general_evacuation',
]

type Props = NativeStackScreenProps<RootStackParamList, 'ManualReportEntry'>

export default function ManualReportEntryScreen({ navigation }: Props) {
	const { session } = useAuth()
	const createMutation = useCreateReport()

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors, isValid },
	} = useForm<ManualReportFormValues>({
		resolver: zodResolver(manualReportSchema),
		defaultValues: {
			location_name: '',
			headcount: undefined,
			severity: 'medium',
			needs: [],
			contact_number: '',
		},
		mode: 'onChange',
	})

	const onSubmit = async (values: ManualReportFormValues) => {
		try {
			await createMutation.mutateAsync({
				center_id: session!.center_id,
				source: 'manual',
				structured_fields: {
					location_name: values.location_name,
					headcount: values.headcount,
					severity: values.severity,
					needs: values.needs,
					contact_number: values.contact_number,
				},
			})

			// Clear the form first, then show success feedback before navigating
			reset()
			Alert.alert(
				'Report Submitted',
				'The relief report has been submitted successfully.',
				[
					{
						text: 'Submit Another',
						// Stay on the screen with a fresh form
					},
					{
						text: 'Go to Dashboard',
						onPress: () => navigation.navigate('Dashboard'),
					},
				]
			)
		} catch (err: any) {
			const detail = err?.response?.data?.detail
			if (err?.response?.status === 422) {
				Alert.alert(
					'Incomplete Report',
					'Please fill in all required fields before submitting.'
				)
			} else {
				Alert.alert(
					'Submission Failed',
					detail ??
						'Could not submit the report. Check your connection and try again.'
				)
			}
		}
	}

	const isPending = createMutation.isPending

	return (
		<SafeAreaView style={styles.container} edges={['bottom']}>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{/* ── Helper note ────────────────────────────────────────── */}
				<View style={styles.helperBanner}>
					<Text style={styles.helperText}>
						Fill in what you know. Fields marked{' '}
						<Text style={styles.required}>*</Text> are required.
					</Text>
				</View>

				{/* ── Location ───────────────────────────────────────────── */}
				<View style={styles.fieldGroup}>
					<Text style={styles.fieldLabel}>
						Location <Text style={styles.required}>*</Text>
					</Text>
					<Text style={styles.helpText}>
						Village, town, or landmark name
					</Text>
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
								placeholder="e.g. Chak 45, near Main Canal"
								placeholderTextColor={colors.gray400}
								accessibilityLabel="Location name"
								returnKeyType="next"
							/>
						)}
					/>
					{errors.location_name && (
						<Text
							style={styles.errorText}
							accessibilityRole="alert"
						>
							{errors.location_name.message}
						</Text>
					)}
				</View>

				{/* ── Headcount ──────────────────────────────────────────── */}
				<View style={styles.fieldGroup}>
					<Text style={styles.fieldLabel}>
						Headcount <Text style={styles.required}>*</Text>
					</Text>
					<Text style={styles.helpText}>
						Estimated number of people affected
					</Text>
					<Controller
						control={control}
						name="headcount"
						render={({ field: { onChange, value, onBlur } }) => (
							<TextInput
								style={[
									styles.input,
									errors.headcount && styles.inputError,
								]}
								value={value ? String(value) : ''}
								onChangeText={(t) =>
									onChange(t ? parseInt(t, 10) : undefined)
								}
								onBlur={onBlur}
								keyboardType="numeric"
								placeholder="e.g. 250"
								placeholderTextColor={colors.gray400}
								accessibilityLabel="Estimated headcount"
								returnKeyType="done"
							/>
						)}
					/>
					{errors.headcount && (
						<Text
							style={styles.errorText}
							accessibilityRole="alert"
						>
							{errors.headcount.message}
						</Text>
					)}
				</View>

				{/* ── Severity ───────────────────────────────────────────── */}
				<View style={styles.fieldGroup}>
					<Text style={styles.fieldLabel}>
						Severity <Text style={styles.required}>*</Text>
					</Text>
					<Text style={styles.helpText}>
						How urgent is the situation?
					</Text>
					<Controller
						control={control}
						name="severity"
						render={({ field: { onChange, value } }) => (
							<SeveritySegment
								selected={value as Severity}
								onSelect={onChange}
							/>
						)}
					/>
				</View>

				{/* ── Needs ─────────────────────────────────────────────── */}
				<View style={styles.fieldGroup}>
					<Text style={styles.fieldLabel}>
						Needs <Text style={styles.required}>*</Text>
					</Text>
					<Text style={styles.helpText}>Select all that apply</Text>
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
						<Text
							style={styles.errorText}
							accessibilityRole="alert"
						>
							{errors.needs.message}
						</Text>
					)}
				</View>

				{/* ── Contact number ─────────────────────────────────────── */}
				<View style={styles.fieldGroup}>
					<Text style={styles.fieldLabel}>
						Contact Number{' '}
						<Text style={styles.optional}>(optional)</Text>
					</Text>
					<Text style={styles.helpText}>
						Field worker or local contact
					</Text>
					<Controller
						control={control}
						name="contact_number"
						render={({ field: { onChange, value, onBlur } }) => (
							<TextInput
								style={styles.input}
								value={value}
								onChangeText={onChange}
								onBlur={onBlur}
								keyboardType="phone-pad"
								placeholder="+92 300 0000000"
								placeholderTextColor={colors.gray400}
								accessibilityLabel="Contact number (optional)"
							/>
						)}
					/>
				</View>
			</ScrollView>

			{/* ── Submit footer ──────────────────────────────────────────── */}
			<View style={styles.footer}>
				<TouchableOpacity
					style={[
						styles.submitButton,
						(!isValid || isPending) && styles.submitButtonDisabled,
					]}
					onPress={handleSubmit(onSubmit)}
					disabled={!isValid || isPending}
					accessibilityRole="button"
					accessibilityLabel="Submit relief report"
				>
					{isPending ? (
						<ActivityIndicator color={colors.white} />
					) : (
						<Text style={styles.submitButtonText}>
							Submit Report
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

	// ── Helper banner ─────────────────────────────────────────────────────────
	helperBanner: {
		backgroundColor: colors.primaryLight,
		borderRadius: 8,
		padding: spacing.base,
		marginBottom: spacing.base,
		borderWidth: 1,
		borderColor: colors.primary,
		borderStyle: 'dashed',
	},
	helperText: {
		...typography.caption,
		color: colors.primary,
		lineHeight: 18,
	},

	// ── Field groups ──────────────────────────────────────────────────────────
	fieldGroup: {
		marginBottom: spacing.xl,
	},
	fieldLabel: {
		...typography.captionBold,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: spacing.xs,
		color: colors.textSecondary,
	},
	helpText: {
		...typography.caption,
		color: colors.textSecondary,
		marginBottom: spacing.sm,
	},
	required: {
		color: colors.error,
		textTransform: 'none',
	},
	optional: {
		color: colors.gray400,
		fontWeight: '400',
		textTransform: 'none',
		fontSize: 12,
	},
	input: {
		borderWidth: 1.5,
		borderColor: colors.border,
		borderRadius: 10,
		paddingHorizontal: spacing.base,
		height: 50,
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
		marginTop: spacing.sm,
	},

	// ── Footer ────────────────────────────────────────────────────────────────
	footer: {
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.base,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		backgroundColor: colors.surface,
	},
	submitButton: {
		backgroundColor: colors.primary,
		borderRadius: 10,
		height: 52,
		alignItems: 'center',
		justifyContent: 'center',
	},
	submitButtonDisabled: { opacity: 0.45 },
	submitButtonText: {
		...typography.bodyBold,
		color: colors.white,
		fontSize: 17,
	},
})

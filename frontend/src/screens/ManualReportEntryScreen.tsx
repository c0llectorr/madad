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
			navigation.navigate('Dashboard')
		} catch (err: any) {
			Alert.alert(
				'Error',
				err?.response?.data?.detail ?? 'Failed to submit report.'
			)
		}
	}

	const isPending = createMutation.isPending

	return (
		<SafeAreaView style={styles.container} edges={['bottom']}>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps="handled"
			>
				{/* Location */}
				<Text style={styles.fieldLabel}>Location</Text>
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
							placeholder="Search location or describe"
							placeholderTextColor={colors.gray400}
							accessibilityLabel="Location"
						/>
					)}
				/>
				{errors.location_name && (
					<Text style={styles.errorText}>
						{errors.location_name.message}
					</Text>
				)}

				{/* Headcount — labeled "Headcount" in UI, maps to estimated_population server-side */}
				<Text style={styles.fieldLabel}>Headcount</Text>
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
							placeholder="Estimated number of people"
							placeholderTextColor={colors.gray400}
							accessibilityLabel="Headcount"
						/>
					)}
				/>
				{errors.headcount && (
					<Text style={styles.errorText}>
						{errors.headcount.message}
					</Text>
				)}

				{/* Severity — colored segmented buttons, not a dropdown */}
				<Text style={styles.fieldLabel}>Severity</Text>
				<Controller
					control={control}
					name="severity"
					render={({ field: { onChange, value } }) => (
						<SeveritySegment selected={value} onSelect={onChange} />
					)}
				/>

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

				{/* Contact number (optional) */}
				<Text style={styles.fieldLabel}>Contact Number (optional)</Text>
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
							accessibilityLabel="Contact number"
						/>
					)}
				/>
			</ScrollView>

			{/* Submit */}
			<View style={styles.footer}>
				<TouchableOpacity
					style={[
						styles.submitButton,
						(!isValid || isPending) && styles.submitButtonDisabled,
					]}
					onPress={handleSubmit(onSubmit)}
					disabled={!isValid || isPending}
					accessibilityRole="button"
					accessibilityLabel="Submit report"
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
	fieldLabel: {
		...typography.captionBold,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginTop: spacing.base,
		marginBottom: spacing.xs,
		color: colors.textSecondary,
	},
	input: {
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 8,
		paddingHorizontal: spacing.base,
		height: 48,
		...typography.body,
		backgroundColor: colors.surface,
	},
	inputError: { borderColor: colors.error },
	errorText: {
		...typography.caption,
		color: colors.error,
		marginTop: spacing.xs,
	},
	footer: {
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.base,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		backgroundColor: colors.surface,
	},
	submitButton: {
		backgroundColor: colors.primary,
		borderRadius: 8,
		height: 48,
		alignItems: 'center',
		justifyContent: 'center',
	},
	submitButtonDisabled: { opacity: 0.5 },
	submitButtonText: { ...typography.bodyBold, color: colors.white },
})

import React, { useState } from 'react'
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	ActivityIndicator,
	Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/AppNavigator'
import { loginSchema, LoginFormValues } from '../validation/schemas'
import { authApi } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>

export default function LoginScreen({ navigation }: Props) {
	const { signIn } = useAuth()
	const [isLoading, setIsLoading] = useState(false)
	const [focusedField, setFocusedField] = useState<string | null>(null)

	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: { center_code: '', username: '', password: '' },
	})

	const onSubmit = async (values: LoginFormValues) => {
		setIsLoading(true)
		try {
			const res = await authApi.login(values)
			await signIn(
				res.access_token,
				res.role,
				res.center_id,
				res.center_name
			)
			// Navigation handled by AppNavigator reacting to session state
		} catch (err: any) {
			const status = err?.response?.status
			const detail = err?.response?.data?.detail

			if (status === 401 || status === 404) {
				Alert.alert(
					'Incorrect Credentials',
					detail ??
						'The username or password you entered is incorrect. Please try again.'
				)
			} else if (status === 403) {
				Alert.alert(
					'Account Deactivated',
					'This account has been deactivated. Contact your center administrator.'
				)
			} else {
				Alert.alert(
					'Connection Error',
					"Can't reach the server. Check your network connection and try again."
				)
			}
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<SafeAreaView style={styles.container}>
			{/* Brand header band */}
			<View style={styles.brandBand} />

			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.keyboardView}
			>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{/* Logo / branding */}
					<View style={styles.brandBlock}>
						<View style={styles.logoMark}>
							<View style={styles.logoInner} />
						</View>
						<Text style={styles.appName}>Madad</Text>
						<Text style={styles.tagline}>Relief Coordination</Text>
					</View>

					{/* Form card */}
					<View style={styles.card}>
						<Text style={styles.cardTitle}>Sign In</Text>
						<Text style={styles.cardSubtitle}>
							Enter the credentials provided by your relief
							center.
						</Text>

						{/* Center Code */}
						<View style={styles.fieldGroup}>
							<Text style={styles.label}>
								Center Code{' '}
								<Text style={styles.required}>*</Text>
							</Text>
							<Controller
								control={control}
								name="center_code"
								render={({
									field: { onChange, value, onBlur },
								}) => (
									<TextInput
										style={[
											styles.input,
											focusedField === 'center_code' &&
												styles.inputFocused,
											errors.center_code &&
												styles.inputError,
										]}
										value={value}
										onChangeText={onChange}
										onBlur={() => {
											onBlur()
											setFocusedField(null)
										}}
										onFocus={() =>
											setFocusedField('center_code')
										}
										autoCapitalize="characters"
										autoCorrect={false}
										placeholder="e.g. RJP-01"
										placeholderTextColor={colors.gray400}
										accessibilityLabel="Center code"
										returnKeyType="next"
									/>
								)}
							/>
							{errors.center_code && (
								<Text
									style={styles.errorText}
									accessibilityRole="alert"
								>
									{errors.center_code.message}
								</Text>
							)}
						</View>

						{/* Username */}
						<View style={styles.fieldGroup}>
							<Text style={styles.label}>
								Username <Text style={styles.required}>*</Text>
							</Text>
							<Controller
								control={control}
								name="username"
								render={({
									field: { onChange, value, onBlur },
								}) => (
									<TextInput
										style={[
											styles.input,
											focusedField === 'username' &&
												styles.inputFocused,
											errors.username &&
												styles.inputError,
										]}
										value={value}
										onChangeText={onChange}
										onBlur={() => {
											onBlur()
											setFocusedField(null)
										}}
										onFocus={() =>
											setFocusedField('username')
										}
										autoCapitalize="none"
										autoCorrect={false}
										placeholder="Your username"
										placeholderTextColor={colors.gray400}
										accessibilityLabel="Username"
										returnKeyType="next"
									/>
								)}
							/>
							{errors.username && (
								<Text
									style={styles.errorText}
									accessibilityRole="alert"
								>
									{errors.username.message}
								</Text>
							)}
						</View>

						{/* Password */}
						<View style={styles.fieldGroup}>
							<Text style={styles.label}>
								Password <Text style={styles.required}>*</Text>
							</Text>
							<Controller
								control={control}
								name="password"
								render={({
									field: { onChange, value, onBlur },
								}) => (
									<TextInput
										style={[
											styles.input,
											focusedField === 'password' &&
												styles.inputFocused,
											errors.password &&
												styles.inputError,
										]}
										value={value}
										onChangeText={onChange}
										onBlur={() => {
											onBlur()
											setFocusedField(null)
										}}
										onFocus={() =>
											setFocusedField('password')
										}
										secureTextEntry
										placeholder="Your password"
										placeholderTextColor={colors.gray400}
										accessibilityLabel="Password"
										returnKeyType="done"
										onSubmitEditing={handleSubmit(onSubmit)}
									/>
								)}
							/>
							{errors.password && (
								<Text
									style={styles.errorText}
									accessibilityRole="alert"
								>
									{errors.password.message}
								</Text>
							)}
						</View>

						{/* Submit */}
						<TouchableOpacity
							style={[
								styles.loginButton,
								isLoading && styles.loginButtonDisabled,
							]}
							onPress={handleSubmit(onSubmit)}
							disabled={isLoading}
							accessibilityRole="button"
							accessibilityLabel="Log in"
						>
							{isLoading ? (
								<ActivityIndicator color={colors.white} />
							) : (
								<Text style={styles.loginButtonText}>
									Log In
								</Text>
							)}
						</TouchableOpacity>

						{/* Help note */}
						<Text style={styles.helpText}>
							Don&apos;t have credentials? Contact your center
							administrator.
						</Text>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.background,
	},

	// Thin accent band at top using primaryDark
	brandBand: {
		height: 4,
		backgroundColor: colors.primaryDark,
	},

	keyboardView: { flex: 1 },

	scrollContent: {
		flexGrow: 1,
		justifyContent: 'center',
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.xxl,
	},

	// ── Brand block ─────────────────────────────────────────────────────────────
	brandBlock: {
		alignItems: 'center',
		marginBottom: spacing.xxl,
	},
	logoMark: {
		width: 64,
		height: 64,
		borderRadius: 16,
		backgroundColor: colors.primaryDark,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: spacing.base,
	},
	logoInner: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: colors.secondary,
		opacity: 0.85,
	},
	appName: {
		fontSize: 34,
		fontWeight: '800',
		color: colors.primaryDark,
		letterSpacing: -0.5,
		marginBottom: spacing.xs,
	},
	tagline: {
		...typography.body,
		color: colors.textSecondary,
	},

	// ── Form card ───────────────────────────────────────────────────────────────
	card: {
		backgroundColor: colors.surface,
		borderRadius: 16,
		padding: spacing.xl,
		borderWidth: 1,
		borderColor: colors.border,
		// Subtle shadow
		shadowColor: colors.primaryDark,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.06,
		shadowRadius: 8,
		elevation: 3,
	},
	cardTitle: {
		...typography.heading,
		color: colors.primaryDark,
		marginBottom: spacing.xs,
	},
	cardSubtitle: {
		...typography.caption,
		color: colors.textSecondary,
		marginBottom: spacing.xl,
		lineHeight: 20,
	},

	// ── Field ───────────────────────────────────────────────────────────────────
	fieldGroup: {
		marginBottom: spacing.base,
	},
	label: {
		...typography.captionBold,
		color: colors.textSecondary,
		marginBottom: spacing.xs,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	required: {
		color: colors.error,
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
	inputFocused: {
		borderColor: colors.primary,
		backgroundColor: colors.primaryLight,
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

	// ── Login button ─────────────────────────────────────────────────────────────
	loginButton: {
		backgroundColor: colors.primary,
		borderRadius: 10,
		height: 52,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: spacing.xl,
		marginBottom: spacing.base,
	},
	loginButtonDisabled: { opacity: 0.55 },
	loginButtonText: {
		...typography.bodyBold,
		color: colors.white,
		fontSize: 17,
	},

	// ── Help ────────────────────────────────────────────────────────────────────
	helpText: {
		...typography.caption,
		color: colors.textSecondary,
		textAlign: 'center',
		lineHeight: 18,
	},
})

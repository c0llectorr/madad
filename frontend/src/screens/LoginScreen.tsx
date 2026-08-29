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
					'Login Failed',
					detail ?? 'Incorrect username or password'
				)
			} else {
				Alert.alert(
					'Connection Error',
					"Can't reach the server — check your network connection and try again."
				)
			}
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<SafeAreaView style={styles.container}>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.keyboardView}
			>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps="handled"
				>
					<Text style={styles.appName}>Madad</Text>
					<Text style={styles.subtitle}>Relief Coordination</Text>

					<View style={styles.form}>
						{/* Center Code */}
						<Text style={styles.label}>Center Code</Text>
						<Controller
							control={control}
							name="center_code"
							render={({
								field: { onChange, value, onBlur },
							}) => (
								<TextInput
									style={[
										styles.input,
										errors.center_code && styles.inputError,
									]}
									value={value}
									onChangeText={onChange}
									onBlur={onBlur}
									autoCapitalize="characters"
									placeholder="e.g. RJP-01"
									placeholderTextColor={colors.gray400}
									accessibilityLabel="Center code"
								/>
							)}
						/>
						{errors.center_code && (
							<Text style={styles.errorText}>
								{errors.center_code.message}
							</Text>
						)}

						{/* Username */}
						<Text style={styles.label}>Username</Text>
						<Controller
							control={control}
							name="username"
							render={({
								field: { onChange, value, onBlur },
							}) => (
								<TextInput
									style={[
										styles.input,
										errors.username && styles.inputError,
									]}
									value={value}
									onChangeText={onChange}
									onBlur={onBlur}
									autoCapitalize="none"
									placeholder="Username"
									placeholderTextColor={colors.gray400}
									accessibilityLabel="Username"
								/>
							)}
						/>
						{errors.username && (
							<Text style={styles.errorText}>
								{errors.username.message}
							</Text>
						)}

						{/* Password */}
						<Text style={styles.label}>Password</Text>
						<Controller
							control={control}
							name="password"
							render={({
								field: { onChange, value, onBlur },
							}) => (
								<TextInput
									style={[
										styles.input,
										errors.password && styles.inputError,
									]}
									value={value}
									onChangeText={onChange}
									onBlur={onBlur}
									secureTextEntry
									placeholder="Password"
									placeholderTextColor={colors.gray400}
									accessibilityLabel="Password"
								/>
							)}
						/>
						{errors.password && (
							<Text style={styles.errorText}>
								{errors.password.message}
							</Text>
						)}

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
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.background },
	keyboardView: { flex: 1 },
	scrollContent: {
		flexGrow: 1,
		justifyContent: 'center',
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.xxl,
	},
	appName: {
		...typography.heading,
		fontSize: 36,
		color: colors.primary,
		textAlign: 'center',
		marginBottom: spacing.xs,
	},
	subtitle: {
		...typography.caption,
		textAlign: 'center',
		marginBottom: spacing.xxl,
	},
	form: { gap: spacing.xs },
	label: {
		...typography.captionBold,
		color: colors.textSecondary,
		marginTop: spacing.base,
		marginBottom: spacing.xs,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
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
	loginButton: {
		backgroundColor: colors.primary,
		borderRadius: 8,
		height: 48,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: spacing.xl,
	},
	loginButtonDisabled: { opacity: 0.6 },
	loginButtonText: { ...typography.bodyBold, color: colors.white },
})

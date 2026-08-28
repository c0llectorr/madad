import React from 'react'
import {
	TouchableOpacity,
	Text,
	StyleSheet,
	ActivityIndicator,
	ViewStyle,
} from 'react-native'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

interface Props {
	label: string
	onPress: () => void
	isLoading?: boolean
	disabled?: boolean
	style?: ViewStyle
	accessibilityLabel?: string
}

export default function PrimaryButton({
	label,
	onPress,
	isLoading = false,
	disabled = false,
	style,
	accessibilityLabel,
}: Props) {
	const isDisabled = disabled || isLoading
	return (
		<TouchableOpacity
			style={[styles.button, isDisabled && styles.buttonDisabled, style]}
			onPress={onPress}
			disabled={isDisabled}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel ?? label}
		>
			{isLoading ? (
				<ActivityIndicator color={colors.white} />
			) : (
				<Text style={styles.label}>{label}</Text>
			)}
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	button: {
		backgroundColor: colors.primary,
		borderRadius: 8,
		height: 48,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.lg,
	},
	buttonDisabled: { opacity: 0.5 },
	label: { ...typography.bodyBold, color: colors.white },
})

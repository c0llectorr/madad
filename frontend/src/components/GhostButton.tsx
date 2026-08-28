import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

interface Props {
	label: string
	onPress: () => void
	disabled?: boolean
	style?: ViewStyle
	accessibilityLabel?: string
}

/** Ghost-styled secondary button — used for Discard/Cancel actions */
export default function GhostButton({
	label,
	onPress,
	disabled = false,
	style,
	accessibilityLabel,
}: Props) {
	return (
		<TouchableOpacity
			style={[styles.button, disabled && styles.buttonDisabled, style]}
			onPress={onPress}
			disabled={disabled}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel ?? label}
		>
			<Text style={styles.label}>{label}</Text>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	button: {
		height: 48,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.lg,
	},
	buttonDisabled: { opacity: 0.5 },
	label: { ...typography.bodyBold, color: colors.textSecondary },
})

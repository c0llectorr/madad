import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

interface Props {
	message: string
	onRetry?: () => void
}

/**
 * Inline degraded-state indicator — shown inside a card/strip when a fetch fails.
 * Never a full-screen error; the surrounding UI stays visible.
 */
export default function ErrorInline({ message, onRetry }: Props) {
	return (
		<View style={styles.container}>
			<Text style={styles.message}>{message}</Text>
			{onRetry && (
				<TouchableOpacity
					onPress={onRetry}
					accessibilityRole="button"
					accessibilityLabel="Retry"
				>
					<Text style={styles.retry}>Retry</Text>
				</TouchableOpacity>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		paddingVertical: spacing.xs,
	},
	message: { ...typography.caption, color: colors.error },
	retry: { ...typography.captionBold, color: colors.primary },
})

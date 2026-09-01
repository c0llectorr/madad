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
 * Inline degraded-state indicator — shown inside a card or strip when a fetch fails.
 * Never a full-screen error; the surrounding UI stays visible and functional.
 * The retry target meets the 48dp minimum touch target guideline.
 */
export default function ErrorInline({ message, onRetry }: Props) {
	return (
		<View style={styles.container}>
			{/* Error indicator dot */}
			<View style={styles.dot} />

			<Text style={styles.message} numberOfLines={2}>
				{message}
			</Text>

			{onRetry && (
				<TouchableOpacity
					style={styles.retryButton}
					onPress={onRetry}
					accessibilityRole="button"
					accessibilityLabel={`Retry: ${message}`}
					hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
				>
					<Text style={styles.retryText}>Retry</Text>
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
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.xs,
	},
	dot: {
		width: 7,
		height: 7,
		borderRadius: 3.5,
		backgroundColor: colors.error,
		flexShrink: 0,
	},
	message: {
		...typography.caption,
		color: colors.error,
		flex: 1,
		lineHeight: 18,
	},
	retryButton: {
		minHeight: 36,
		minWidth: 52,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.errorLight,
		borderRadius: 8,
		paddingHorizontal: spacing.sm,
		flexShrink: 0,
	},
	retryText: {
		...typography.captionBold,
		color: colors.error,
		fontSize: 13,
	},
})

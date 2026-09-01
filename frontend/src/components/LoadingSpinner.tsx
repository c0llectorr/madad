import React from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { colors } from '../theme/colors'
import { typography } from '../theme/typography'
import { spacing } from '../theme/spacing'

interface Props {
	size?: 'small' | 'large'
	/**
	 * When true (default), renders centred in a flex:1 container.
	 * Set to false to render inline (e.g. inside a card or button).
	 */
	fullScreen?: boolean
	/** Optional descriptive label shown below the spinner in full-screen mode. */
	label?: string
}

/**
 * Shared loading spinner — use everywhere, never a different spinner per screen.
 * Supports an optional text label for full-screen states so users know what is loading.
 */
export default function LoadingSpinner({
	size = 'large',
	fullScreen = true,
	label,
}: Props) {
	if (!fullScreen) {
		return <ActivityIndicator size={size} color={colors.primary} />
	}

	return (
		<View style={styles.container}>
			<ActivityIndicator size={size} color={colors.primary} />
			{label ? <Text style={styles.label}>{label}</Text> : null}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.background,
		gap: spacing.base,
	},
	label: {
		...typography.caption,
		color: colors.textSecondary,
		textAlign: 'center',
	},
})

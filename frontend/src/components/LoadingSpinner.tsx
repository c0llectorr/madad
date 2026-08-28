import React from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { colors } from '../theme/colors'

interface Props {
	size?: 'small' | 'large'
	fullScreen?: boolean
}

/** Shared loading spinner — use this everywhere, never a different spinner per screen */
export default function LoadingSpinner({
	size = 'large',
	fullScreen = true,
}: Props) {
	if (!fullScreen) {
		return <ActivityIndicator size={size} color={colors.primary} />
	}
	return (
		<View style={styles.container}>
			<ActivityIndicator size={size} color={colors.primary} />
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
})

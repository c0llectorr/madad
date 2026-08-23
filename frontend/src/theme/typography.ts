// MADAD typography scale
// One font family, three sizes only — resist adding a fourth

import { StyleSheet, TextStyle } from 'react-native'
import { colors } from './colors'

export const fontFamily = {
	regular: undefined, // System default (San Francisco on iOS, Roboto on Android)
	bold: undefined,
} as const

export const typography = {
	heading: {
		fontSize: 20,
		fontWeight: '700',
		color: colors.textPrimary,
		lineHeight: 28,
	} as TextStyle,

	body: {
		fontSize: 16,
		fontWeight: '400',
		color: colors.textPrimary,
		lineHeight: 24,
	} as TextStyle,

	caption: {
		fontSize: 13,
		fontWeight: '400',
		color: colors.textSecondary,
		lineHeight: 18,
	} as TextStyle,

	// Utility variants
	bodyBold: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.textPrimary,
		lineHeight: 24,
	} as TextStyle,

	captionBold: {
		fontSize: 13,
		fontWeight: '600',
		color: colors.textSecondary,
		lineHeight: 18,
	} as TextStyle,

	label: {
		fontSize: 13,
		fontWeight: '500',
		color: colors.textSecondary,
		lineHeight: 18,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	} as TextStyle,
} as const

export type Typography = typeof typography

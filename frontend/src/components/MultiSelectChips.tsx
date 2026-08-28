import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

interface Props {
	options: readonly string[]
	selected: readonly string[]
	onToggle: (option: string) => void
	accentColor?: string
}

/**
 * Shared multi-select chip component — used on Report Review (Screen 5) and
 * Manual Report Entry (Screen 6). Same component, consistent UX.
 */
export default function MultiSelectChips({
	options,
	selected,
	onToggle,
	accentColor = colors.primary,
}: Props) {
	return (
		<View style={styles.row}>
			{options.map((opt) => {
				const isSelected = selected.includes(opt)
				return (
					<TouchableOpacity
						key={opt}
						style={[
							styles.chip,
							isSelected && {
								backgroundColor: accentColor,
								borderColor: accentColor,
							},
						]}
						onPress={() => onToggle(opt)}
						accessibilityRole="checkbox"
						accessibilityState={{ checked: isSelected }}
						accessibilityLabel={opt.replace(/_/g, ' ')}
					>
						<Text
							style={[
								styles.chipText,
								isSelected && styles.chipTextSelected,
							]}
						>
							{opt.replace(/_/g, ' ')}
						</Text>
					</TouchableOpacity>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
	chip: {
		borderRadius: 20,
		borderWidth: 1,
		borderColor: colors.border,
		paddingHorizontal: spacing.base,
		paddingVertical: spacing.sm,
		backgroundColor: colors.surface,
		minHeight: 36,
		justifyContent: 'center',
	},
	chipText: {
		...typography.caption,
		color: colors.textPrimary,
		textTransform: 'capitalize',
	},
	chipTextSelected: { color: colors.white, fontWeight: '600' },
})

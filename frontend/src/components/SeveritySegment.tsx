import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'
import { Severity } from '../types'

interface Props {
	selected: Severity
	onSelect: (severity: Severity) => void
}

const SEGMENTS: { value: Severity; label: string; color: string }[] = [
	{ value: 'low', label: 'Low', color: colors.severityLow },
	{ value: 'medium', label: 'Medium', color: colors.severityMedium },
	{ value: 'high', label: 'High', color: colors.severityHigh },
	{ value: 'critical', label: 'Critical', color: colors.severityCritical },
]

/**
 * Colored segmented severity selector — visually obvious, not a plain dropdown.
 * Used on Manual Report Entry (Screen 6).
 */
export default function SeveritySegment({ selected, onSelect }: Props) {
	return (
		<View style={styles.container}>
			{SEGMENTS.map((seg, index) => {
				const isSelected = selected === seg.value
				const isFirst = index === 0
				const isLast = index === SEGMENTS.length - 1
				return (
					<TouchableOpacity
						key={seg.value}
						style={[
							styles.segment,
							isFirst && styles.segmentFirst,
							isLast && styles.segmentLast,
							isSelected && {
								backgroundColor: seg.color,
								borderColor: seg.color,
							},
						]}
						onPress={() => onSelect(seg.value)}
						accessibilityRole="radio"
						accessibilityState={{ checked: isSelected }}
						accessibilityLabel={`Severity ${seg.label}`}
					>
						<Text
							style={[
								styles.segmentText,
								isSelected && styles.segmentTextSelected,
								!isSelected && { color: seg.color },
							]}
						>
							{seg.label}
						</Text>
					</TouchableOpacity>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		borderRadius: 8,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: colors.border,
	},
	segment: {
		flex: 1,
		height: 48,
		alignItems: 'center',
		justifyContent: 'center',
		borderRightWidth: 1,
		borderRightColor: colors.border,
		backgroundColor: colors.surface,
	},
	segmentFirst: { borderLeftWidth: 0 },
	segmentLast: { borderRightWidth: 0 },
	segmentText: { ...typography.captionBold },
	segmentTextSelected: { color: colors.white },
})

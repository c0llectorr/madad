import React, { useRef, useState } from 'react'
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	Dimensions,
	ListRenderItemInfo,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/AppNavigator'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

const { width } = Dimensions.get('window')

const ONBOARDING_KEY = 'hasSeenOnboarding'

interface Slide {
	id: string
	title: string
	body: string
}

const SLIDES: Slide[] = [
	{
		id: '1',
		title: 'Madad',
		body: 'Coordinating relief, faster.',
	},
	{
		id: '2',
		title: 'Every report. Every route.',
		body: 'See every incoming report, plan allocations, and dispatch resources — all in real time.',
	},
	{
		id: '3',
		title: 'Ready to help.',
		body: 'Log in with your center credentials to get started.',
	},
]

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>

export default function OnboardingScreen({ navigation }: Props) {
	const [activeIndex, setActiveIndex] = useState(0)
	const flatListRef = useRef<FlatList<Slide>>(null)

	const finish = async () => {
		await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
		navigation.replace('Login')
	}

	const handleNext = () => {
		if (activeIndex < SLIDES.length - 1) {
			flatListRef.current?.scrollToIndex({ index: activeIndex + 1 })
		} else {
			finish()
		}
	}

	const renderItem = ({ item }: ListRenderItemInfo<Slide>) => (
		<View style={styles.slide}>
			<Text style={styles.title}>{item.title}</Text>
			<Text style={styles.body}>{item.body}</Text>
		</View>
	)

	const isLast = activeIndex === SLIDES.length - 1

	return (
		<SafeAreaView style={styles.container}>
			{/* Skip link — always visible */}
			<TouchableOpacity style={styles.skipButton} onPress={finish}>
				<Text style={styles.skipText}>Skip</Text>
			</TouchableOpacity>

			<FlatList
				ref={flatListRef}
				data={SLIDES}
				renderItem={renderItem}
				keyExtractor={(item) => item.id}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				onMomentumScrollEnd={(e) => {
					setActiveIndex(
						Math.round(e.nativeEvent.contentOffset.x / width)
					)
				}}
			/>

			{/* Dot indicators */}
			<View style={styles.dots}>
				{SLIDES.map((_, i) => (
					<View
						key={i}
						style={[
							styles.dot,
							i === activeIndex && styles.dotActive,
						]}
					/>
				))}
			</View>

			<TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
				<Text style={styles.primaryButtonText}>
					{isLast ? 'Get Started' : 'Next'}
				</Text>
			</TouchableOpacity>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.primaryLight,
		alignItems: 'center',
	},
	skipButton: {
		alignSelf: 'flex-end',
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.base,
		minHeight: 48,
		justifyContent: 'center',
	},
	skipText: {
		...typography.body,
		color: colors.primary,
	},
	slide: {
		width,
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.lg,
	},
	title: {
		...typography.heading,
		fontSize: 32,
		color: colors.primary,
		textAlign: 'center',
		marginBottom: spacing.base,
	},
	body: {
		...typography.body,
		color: colors.textSecondary,
		textAlign: 'center',
	},
	dots: {
		flexDirection: 'row',
		marginBottom: spacing.xl,
		gap: spacing.sm,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: colors.gray300,
	},
	dotActive: {
		backgroundColor: colors.primary,
		width: 20,
	},
	primaryButton: {
		backgroundColor: colors.primary,
		marginHorizontal: spacing.lg,
		marginBottom: spacing.xl,
		borderRadius: 8,
		height: 48,
		width: width - spacing.lg * 2,
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryButtonText: {
		...typography.bodyBold,
		color: colors.white,
	},
})

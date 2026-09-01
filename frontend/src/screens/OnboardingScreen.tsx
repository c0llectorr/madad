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
import { StatusBar } from 'expo-status-bar'
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
	eyebrow: string
	title: string
	body: string
}

const SLIDES: Slide[] = [
	{
		id: '1',
		eyebrow: 'Welcome to',
		title: 'Madad',
		body: 'Coordinating flood relief, faster.',
	},
	{
		id: '2',
		eyebrow: 'Stay Informed',
		title: 'Every report.\nEvery route.',
		body: 'See incoming field reports, plan resource allocations, and dispatch aid — all in real time.',
	},
	{
		id: '3',
		eyebrow: 'Ready When You Are',
		title: 'Log in to\nget started.',
		body: 'Use the credentials provided by your relief center to access your dashboard.',
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
			<View style={styles.iconContainer}>
				{/* Simple geometric mark — avoids distressing imagery */}
				<View style={styles.iconRing}>
					<View style={styles.iconInner} />
				</View>
			</View>
			<Text style={styles.eyebrow}>{item.eyebrow}</Text>
			<Text style={styles.title}>{item.title}</Text>
			<Text style={styles.body}>{item.body}</Text>
		</View>
	)

	const isLast = activeIndex === SLIDES.length - 1

	return (
		<SafeAreaView style={styles.container}>
			{/* White status bar icons for the dark primaryDark background */}
			<StatusBar style="light" />

			{/* Skip link — top-right, always visible */}
			<TouchableOpacity
				style={styles.skipButton}
				onPress={finish}
				accessibilityRole="button"
				accessibilityLabel="Skip onboarding"
			>
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
				scrollEnabled
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

			{/* Primary action */}
			<TouchableOpacity
				style={styles.primaryButton}
				onPress={handleNext}
				accessibilityRole="button"
				accessibilityLabel={isLast ? 'Get started' : 'Next slide'}
			>
				<Text style={styles.primaryButtonText}>
					{isLast ? 'Get Started' : 'Next'}
				</Text>
			</TouchableOpacity>

			{/* Bottom spacer */}
			<View style={styles.bottomSpacer} />
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.primaryDark,
		alignItems: 'center',
	},

	// ── Skip ────────────────────────────────────────────────────────────────────
	skipButton: {
		alignSelf: 'flex-end',
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.base,
		minHeight: 48,
		justifyContent: 'center',
	},
	skipText: {
		...typography.body,
		color: colors.secondary,
	},

	// ── Slide ───────────────────────────────────────────────────────────────────
	slide: {
		width,
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.lg * 1.5,
	},

	// Simple geometric illustration — calm, not alarming
	iconContainer: {
		marginBottom: spacing.xxl,
	},
	iconRing: {
		width: 80,
		height: 80,
		borderRadius: 40,
		borderWidth: 3,
		borderColor: colors.secondary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconInner: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: colors.secondary,
		opacity: 0.6,
	},

	eyebrow: {
		...typography.caption,
		color: colors.secondary,
		textTransform: 'uppercase',
		letterSpacing: 1.5,
		marginBottom: spacing.sm,
		textAlign: 'center',
	},
	title: {
		fontSize: 32,
		fontWeight: '700',
		color: colors.white,
		textAlign: 'center',
		lineHeight: 40,
		marginBottom: spacing.base,
	},
	body: {
		...typography.body,
		color: 'rgba(255,255,255,0.70)',
		textAlign: 'center',
		lineHeight: 26,
	},

	// ── Dots ────────────────────────────────────────────────────────────────────
	dots: {
		flexDirection: 'row',
		marginBottom: spacing.xl,
		gap: spacing.sm,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: 'rgba(255,255,255,0.30)',
	},
	dotActive: {
		backgroundColor: colors.secondary,
		width: 24,
	},

	// ── Primary button ──────────────────────────────────────────────────────────
	primaryButton: {
		backgroundColor: colors.primary,
		marginHorizontal: spacing.lg,
		borderRadius: 10,
		height: 52,
		width: width - spacing.lg * 2,
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryButtonText: {
		...typography.bodyBold,
		color: colors.white,
		fontSize: 17,
	},

	bottomSpacer: { height: spacing.xl },
})

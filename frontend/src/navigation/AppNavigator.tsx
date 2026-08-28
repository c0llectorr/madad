import React, { useEffect, useState } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

// Screens
import OnboardingScreen from '../screens/OnboardingScreen'
import LoginScreen from '../screens/LoginScreen'
import DashboardScreen from '../screens/DashboardScreen'
import ReportInboxScreen from '../screens/ReportInboxScreen'
import ReportReviewScreen from '../screens/ReportReviewScreen'
import ManualReportEntryScreen from '../screens/ManualReportEntryScreen'
import MapScreen from '../screens/MapScreen'
import AllocationPlanScreen from '../screens/AllocationPlanScreen'
import DispatchDetailScreen from '../screens/DispatchDetailScreen'

// Types
import {
	ExtractReportResponse,
	CreateDispatchResponse,
	Depot,
	Site,
} from '../types'
import { colors } from '../theme/colors'
import { typography } from '../theme/typography'

export type RootStackParamList = {
	Onboarding: undefined
	Login: undefined
	Dashboard: undefined
	ReportInbox: undefined
	ReportReview: { extractResult: ExtractReportResponse }
	ManualReportEntry: undefined
	Map: undefined
	AllocationPlan: undefined
	DispatchDetail: {
		dispatch: CreateDispatchResponse
		depot: Depot
		site: Site
	}
}

const Stack = createNativeStackNavigator<RootStackParamList>()

const ONBOARDING_KEY = 'hasSeenOnboarding'

export default function AppNavigator() {
	const { session, isLoading } = useAuth()
	const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(
		null
	)

	useEffect(() => {
		AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
			setHasSeenOnboarding(val === 'true')
		})
	}, [])

	// Wait for both auth state and onboarding flag to resolve
	if (isLoading || hasSeenOnboarding === null) {
		return <LoadingSpinner />
	}

	const defaultScreenOptions = {
		headerStyle: { backgroundColor: colors.surface },
		headerTintColor: colors.primary,
		headerTitleStyle: { ...typography.bodyBold, color: colors.textPrimary },
		headerShadowVisible: false,
	}

	return (
		<Stack.Navigator screenOptions={defaultScreenOptions}>
			{!session ? (
				// Unauthenticated stack
				<>
					{!hasSeenOnboarding && (
						<Stack.Screen
							name="Onboarding"
							component={OnboardingScreen}
							options={{ headerShown: false }}
						/>
					)}
					<Stack.Screen
						name="Login"
						component={LoginScreen}
						options={{ headerShown: false }}
					/>
				</>
			) : (
				// Authenticated stack
				<>
					<Stack.Screen
						name="Dashboard"
						component={DashboardScreen}
						options={{ title: 'Dashboard', headerShown: false }}
					/>
					<Stack.Screen
						name="ReportInbox"
						component={ReportInboxScreen}
						options={{ title: 'Report Inbox' }}
					/>
					<Stack.Screen
						name="ReportReview"
						component={ReportReviewScreen}
						options={{ title: 'Review Report' }}
					/>
					<Stack.Screen
						name="ManualReportEntry"
						component={ManualReportEntryScreen}
						options={{ title: 'New Report' }}
					/>
					<Stack.Screen
						name="Map"
						component={MapScreen}
						options={{ title: 'Map', headerShown: false }}
					/>
					<Stack.Screen
						name="AllocationPlan"
						component={AllocationPlanScreen}
						options={{ title: 'Allocation Plan' }}
					/>
					<Stack.Screen
						name="DispatchDetail"
						component={DispatchDetailScreen}
						options={{ title: 'Dispatch Detail' }}
					/>
				</>
			)}
		</Stack.Navigator>
	)
}

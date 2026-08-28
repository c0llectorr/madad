import { enableScreens } from 'react-native-screens'

import React from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../src/lib/queryClient'
import { AuthProvider } from '../src/context/AuthContext'
import AppNavigator from '../src/navigation/AppNavigator'
import { setupMocks } from '../src/mocks'

// Bootstrap mock API layer before any component mounts.
// setupMocks() is a no-op when EXPO_PUBLIC_USE_MOCK is not 'true'.
setupMocks()

enableScreens()

export default function App() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<QueryClientProvider client={queryClient}>
					<AuthProvider>
						<AppNavigator />
					</AuthProvider>
				</QueryClientProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	)
}

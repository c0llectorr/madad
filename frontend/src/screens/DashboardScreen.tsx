import React from 'react'
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	FlatList,
	Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/AppNavigator'
import { useReports } from '../hooks/useReports'
import { useSites } from '../hooks/useSites'
import { useDepots } from '../hooks/useDepots'
import { useAuth } from '../context/AuthContext'
import ErrorInline from '../components/ErrorInline'
import LoadingSpinner from '../components/LoadingSpinner'
import DepotChip from '../components/DepotChip'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'
import { Depot } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>

export default function DashboardScreen({ navigation }: Props) {
	const { session, signOut } = useAuth()
	const reports = useReports('pending_extraction')
	const sites = useSites('unserved')
	const depots = useDepots()

	const pendingCount = reports.data?.length ?? 0
	const activeSiteCount = sites.data?.length ?? 0

	const handleLogout = () => {
		Alert.alert('Sign out', 'Are you sure you want to sign out?', [
			{ text: 'Cancel', style: 'cancel' },
			{ text: 'Sign out', style: 'destructive', onPress: signOut },
		])
	}

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<ScrollView contentContainerStyle={styles.scrollContent}>
				{/* Header */}
				<View style={styles.header}>
					<View style={styles.headerRow}>
						<View>
							<Text style={styles.centerName}>
								{session?.center_name}
							</Text>
							<Text style={styles.greeting}>
								Good morning, Coordinator
							</Text>
						</View>
						<TouchableOpacity
							style={styles.logoutButton}
							onPress={handleLogout}
							accessibilityRole="button"
							accessibilityLabel="Sign out"
						>
							<Text style={styles.logoutText}>Sign out</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Dashboard cards */}
				<TouchableOpacity
					style={styles.card}
					onPress={() => navigation.navigate('ReportInbox')}
					accessibilityRole="button"
					accessibilityLabel={`Pending reports, ${pendingCount} awaiting review`}
				>
					<View style={styles.cardContent}>
						<Text style={styles.cardTitle}>Pending Reports</Text>
						<Text style={styles.cardSubtitle}>Awaiting review</Text>
						{reports.isError ? (
							<ErrorInline message="Unable to load" />
						) : reports.isLoading ? (
							<LoadingSpinner size="small" />
						) : (
							<View style={styles.badge}>
								<Text style={styles.badgeText}>
									{pendingCount}
								</Text>
							</View>
						)}
					</View>
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.card}
					onPress={() => navigation.navigate('Map')}
					accessibilityRole="button"
					accessibilityLabel={`Active sites, ${activeSiteCount} unserved`}
				>
					<View style={styles.cardContent}>
						<Text style={styles.cardTitle}>Active Sites</Text>
						<Text style={styles.cardSubtitle}>
							Unserved locations
						</Text>
						{sites.isError ? (
							<ErrorInline message="Unable to load" />
						) : sites.isLoading ? (
							<LoadingSpinner size="small" />
						) : (
							<View
								style={[
									styles.badge,
									{ backgroundColor: colors.urgencyMedium },
								]}
							>
								<Text style={styles.badgeText}>
									{activeSiteCount}
								</Text>
							</View>
						)}
					</View>
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.card}
					onPress={() => navigation.navigate('AllocationPlan')}
					accessibilityRole="button"
					accessibilityLabel="Today's dispatches"
				>
					<View style={styles.cardContent}>
						<Text style={styles.cardTitle}>Today's Dispatches</Text>
						<Text style={styles.cardSubtitle}>
							View allocation plan
						</Text>
						<View
							style={[
								styles.badge,
								{ backgroundColor: colors.statusEnRoute },
							]}
						>
							<Text style={styles.badgeText}>→</Text>
						</View>
					</View>
				</TouchableOpacity>

				{/* Depot inventory strip */}
				<Text style={styles.sectionLabel}>Depot Inventory</Text>
				{depots.isError ? (
					<ErrorInline message="Unable to load depot inventory" />
				) : depots.isLoading ? (
					<LoadingSpinner size="small" />
				) : (
					<FlatList
						data={depots.data}
						keyExtractor={(item: Depot) => String(item.id)}
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.depotStrip}
						renderItem={({ item }) => <DepotChip depot={item} />}
					/>
				)}
			</ScrollView>

			{/* FAB — New Report */}
			<TouchableOpacity
				style={styles.fab}
				onPress={() => navigation.navigate('ManualReportEntry')}
				accessibilityRole="button"
				accessibilityLabel="New report"
			>
				<Text style={styles.fabText}>＋</Text>
			</TouchableOpacity>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.background },
	scrollContent: {
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.base,
		paddingBottom: spacing.xxxl,
	},
	header: { marginBottom: spacing.xl },
	headerRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
	},
	centerName: { ...typography.heading, color: colors.primary },
	greeting: { ...typography.caption },
	logoutButton: {
		paddingHorizontal: spacing.base,
		paddingVertical: spacing.sm,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.surface,
		justifyContent: 'center',
	},
	logoutText: { ...typography.caption, color: colors.textSecondary },
	card: {
		backgroundColor: colors.surface,
		borderRadius: 12,
		marginBottom: spacing.base,
		padding: spacing.base,
		borderWidth: 1,
		borderColor: colors.border,
		minHeight: 80,
		justifyContent: 'center',
	},
	cardContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	cardTitle: { ...typography.bodyBold, flex: 1 },
	cardSubtitle: { ...typography.caption, flex: 1 },
	badge: {
		backgroundColor: colors.primary,
		borderRadius: 16,
		minWidth: 32,
		height: 32,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.sm,
	},
	badgeText: { ...typography.bodyBold, color: colors.white },
	sectionLabel: {
		...typography.label,
		marginTop: spacing.xl,
		marginBottom: spacing.sm,
	},
	depotStrip: { gap: spacing.sm, paddingVertical: spacing.xs },
	fab: {
		position: 'absolute',
		bottom: spacing.xl,
		right: spacing.lg,
		backgroundColor: colors.primary,
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 6,
		shadowColor: colors.black,
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.25,
		shadowRadius: 4,
	},
	fabText: { color: colors.white, fontSize: 24, lineHeight: 28 },
})

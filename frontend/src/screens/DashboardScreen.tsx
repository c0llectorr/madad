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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
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

/** Return a time-appropriate greeting without relying on a hardcoded string. */
function greeting(): string {
	const hour = new Date().getHours()
	if (hour < 12) return 'Good morning'
	if (hour < 17) return 'Good afternoon'
	return 'Good evening'
}

// ── Simple icon primitives (no extra dependency) ─────────────────────────────

function IconDocument() {
	return (
		<View style={iconStyles.container}>
			<View style={iconStyles.docOuter}>
				<View style={iconStyles.docLine} />
				<View style={[iconStyles.docLine, { width: '60%' }]} />
				<View style={[iconStyles.docLine, { width: '75%' }]} />
			</View>
		</View>
	)
}

function IconPin() {
	return (
		<View style={iconStyles.container}>
			<View style={iconStyles.pinHead} />
			<View style={iconStyles.pinTail} />
		</View>
	)
}

function IconTruck() {
	return (
		<View style={iconStyles.container}>
			<View style={iconStyles.truckBody} />
			<View style={iconStyles.truckCab} />
		</View>
	)
}

const iconStyles = StyleSheet.create({
	container: {
		width: 40,
		height: 40,
		borderRadius: 10,
		backgroundColor: 'rgba(255,255,255,0.18)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	// Document icon
	docOuter: {
		width: 20,
		height: 24,
		borderRadius: 3,
		borderWidth: 2,
		borderColor: colors.white,
		padding: 3,
		gap: 3,
	},
	docLine: {
		height: 2,
		width: '100%',
		backgroundColor: colors.white,
		borderRadius: 1,
	},
	// Pin icon
	pinHead: {
		width: 14,
		height: 14,
		borderRadius: 7,
		borderWidth: 2.5,
		borderColor: colors.white,
		marginBottom: 1,
	},
	pinTail: {
		width: 2.5,
		height: 8,
		backgroundColor: colors.white,
		borderRadius: 1.5,
	},
	// Truck icon
	truckBody: {
		width: 22,
		height: 12,
		backgroundColor: colors.white,
		borderRadius: 3,
	},
	truckCab: {
		position: 'absolute',
		right: 5,
		top: 10,
		width: 10,
		height: 8,
		backgroundColor: colors.white,
		borderTopLeftRadius: 2,
		borderTopRightRadius: 3,
	},
})

// ── Card accent colours ───────────────────────────────────────────────────────

const CARD_COLORS = {
	reports: colors.primaryDark,
	sites: colors.primary,
	dispatches: '#2E7D6E', // teal — derived from secondary for contrast
} as const

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardScreen({ navigation }: Props) {
	const { session, signOut } = useAuth()
	const reports = useReports('pending_extraction')
	const sites = useSites('unserved')
	const depots = useDepots()
	const insets = useSafeAreaInsets()

	const pendingCount = reports.data?.length ?? 0
	const activeSiteCount = sites.data?.length ?? 0

	const handleLogout = () => {
		Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
			{ text: 'Cancel', style: 'cancel' },
			{ text: 'Sign Out', style: 'destructive', onPress: signOut },
		])
	}

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			{/* ── Header ─────────────────────────────────────────────────── */}
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<View style={styles.logoMark} />
					<View>
						<Text style={styles.centerName} numberOfLines={1}>
							{session?.center_name ?? 'Relief Center'}
						</Text>
						<Text style={styles.greeting}>
							{greeting()}, Coordinator
						</Text>
					</View>
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

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{/* ── Section label ──────────────────────────────────────── */}
				<Text style={styles.sectionLabel}>Operations Overview</Text>

				{/* ── Card: Pending Reports ──────────────────────────────── */}
				<TouchableOpacity
					style={[
						styles.card,
						{ backgroundColor: CARD_COLORS.reports },
					]}
					onPress={() => navigation.navigate('ReportInbox')}
					activeOpacity={0.82}
					accessibilityRole="button"
					accessibilityLabel={`Pending reports. ${pendingCount} awaiting review. Tap to open.`}
				>
					<View style={styles.cardRow}>
						<View style={styles.cardText}>
							<Text style={styles.cardTitle}>
								Pending Reports
							</Text>
							<Text style={styles.cardSubtitle}>
								Awaiting your review
							</Text>
						</View>
						<View style={styles.cardRight}>
							<IconDocument />
							{reports.isError ? (
								<View style={styles.badgeError}>
									<Text style={styles.badgeText}>!</Text>
								</View>
							) : reports.isLoading ? (
								<LoadingSpinner
									size="small"
									fullScreen={false}
								/>
							) : (
								<View style={styles.badge}>
									<Text style={styles.badgeText}>
										{pendingCount}
									</Text>
								</View>
							)}
						</View>
					</View>
					{reports.isError && (
						<Text style={styles.cardErrorNote}>
							Unable to load — tap to retry
						</Text>
					)}
				</TouchableOpacity>

				{/* ── Card: Active Sites ─────────────────────────────────── */}
				<TouchableOpacity
					style={[
						styles.card,
						{ backgroundColor: CARD_COLORS.sites },
					]}
					onPress={() => navigation.navigate('Map')}
					activeOpacity={0.82}
					accessibilityRole="button"
					accessibilityLabel={`Active sites. ${activeSiteCount} unserved locations. Tap to view map.`}
				>
					<View style={styles.cardRow}>
						<View style={styles.cardText}>
							<Text style={styles.cardTitle}>Active Sites</Text>
							<Text style={styles.cardSubtitle}>
								Unserved locations
							</Text>
						</View>
						<View style={styles.cardRight}>
							<IconPin />
							{sites.isError ? (
								<View style={styles.badgeError}>
									<Text style={styles.badgeText}>!</Text>
								</View>
							) : sites.isLoading ? (
								<LoadingSpinner
									size="small"
									fullScreen={false}
								/>
							) : (
								<View style={styles.badge}>
									<Text style={styles.badgeText}>
										{activeSiteCount}
									</Text>
								</View>
							)}
						</View>
					</View>
					{sites.isError && (
						<Text style={styles.cardErrorNote}>
							Unable to load — tap to retry
						</Text>
					)}
				</TouchableOpacity>

				{/* ── Card: Today's Dispatches ───────────────────────────── */}
				<TouchableOpacity
					style={[
						styles.card,
						{ backgroundColor: CARD_COLORS.dispatches },
					]}
					onPress={() => navigation.navigate('AllocationPlan')}
					activeOpacity={0.82}
					accessibilityRole="button"
					accessibilityLabel="Today's dispatches — view allocation plan"
				>
					<View style={styles.cardRow}>
						<View style={styles.cardText}>
							<Text style={styles.cardTitle}>
								Today&apos;s Dispatches
							</Text>
							<Text style={styles.cardSubtitle}>
								View allocation plan
							</Text>
						</View>
						<View style={styles.cardRight}>
							<IconTruck />
							<View style={styles.badge}>
								<Text style={styles.badgeText}>→</Text>
							</View>
						</View>
					</View>
				</TouchableOpacity>

				{/* ── Depot inventory strip ──────────────────────────────── */}
				<View style={styles.depotSection}>
					<Text style={styles.sectionLabel}>Depot Inventory</Text>
					{depots.isError ? (
						<View style={styles.depotError}>
							<ErrorInline
								message="Unable to load depot inventory"
								onRetry={depots.refetch}
							/>
						</View>
					) : depots.isLoading ? (
						<View style={styles.depotLoading}>
							<LoadingSpinner size="small" fullScreen={false} />
							<Text style={styles.depotLoadingText}>
								Loading depots…
							</Text>
						</View>
					) : !depots.data?.length ? (
						<View style={styles.depotEmpty}>
							<Text style={styles.depotEmptyText}>
								No depots assigned to this center.
							</Text>
						</View>
					) : (
						<FlatList
							data={depots.data}
							keyExtractor={(item: Depot) => String(item.id)}
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.depotStrip}
							renderItem={({ item }) => (
								<DepotChip depot={item} />
							)}
						/>
					)}
				</View>
			</ScrollView>

			{/* ── FAB — New Report ───────────────────────────────────────── */}
			<TouchableOpacity
				style={[styles.fab, { bottom: spacing.xl + insets.bottom }]}
				onPress={() => navigation.navigate('ManualReportEntry')}
				accessibilityRole="button"
				accessibilityLabel="Submit a new relief report"
			>
				<Text style={styles.fabPlus}>＋</Text>
				<Text style={styles.fabLabel}>New Report</Text>
			</TouchableOpacity>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.background },

	// ── Header ───────────────────────────────────────────────────────────────
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.base,
		paddingBottom: spacing.base,
		backgroundColor: colors.surface,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		flex: 1,
		marginRight: spacing.base,
	},
	logoMark: {
		width: 36,
		height: 36,
		borderRadius: 9,
		backgroundColor: colors.primaryDark,
	},
	centerName: {
		...typography.bodyBold,
		color: colors.primaryDark,
	},
	greeting: {
		...typography.caption,
		color: colors.textSecondary,
	},
	logoutButton: {
		paddingHorizontal: spacing.base,
		paddingVertical: spacing.sm,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.surface,
		minHeight: 36,
		justifyContent: 'center',
	},
	logoutText: {
		...typography.caption,
		color: colors.textSecondary,
	},

	// ── Scroll content ────────────────────────────────────────────────────────
	scrollContent: {
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.xl,
		paddingBottom: 120, // space for FAB + system nav bar on tall-inset devices
	},
	sectionLabel: {
		...typography.label,
		color: colors.textSecondary,
		marginBottom: spacing.base,
	},

	// ── Cards ─────────────────────────────────────────────────────────────────
	card: {
		borderRadius: 14,
		marginBottom: spacing.base,
		padding: spacing.lg,
		minHeight: 88,
		justifyContent: 'center',
		// Subtle shadow
		shadowColor: colors.primaryDark,
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.15,
		shadowRadius: 6,
		elevation: 4,
	},
	cardRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	cardText: { flex: 1, marginRight: spacing.base },
	cardTitle: {
		fontSize: 17,
		fontWeight: '700',
		color: colors.white,
		lineHeight: 24,
		marginBottom: 2,
	},
	cardSubtitle: {
		...typography.caption,
		color: 'rgba(255,255,255,0.75)',
	},
	cardRight: {
		alignItems: 'center',
		gap: spacing.sm,
	},
	badge: {
		backgroundColor: 'rgba(255,255,255,0.22)',
		borderRadius: 14,
		minWidth: 30,
		height: 30,
		paddingHorizontal: spacing.sm,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badgeError: {
		backgroundColor: colors.errorLight,
		borderRadius: 14,
		width: 30,
		height: 30,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badgeText: {
		fontSize: 14,
		fontWeight: '700',
		color: colors.white,
	},
	cardErrorNote: {
		...typography.caption,
		color: 'rgba(255,255,255,0.80)',
		marginTop: spacing.sm,
	},

	// ── Depot strip ───────────────────────────────────────────────────────────
	depotSection: {
		marginTop: spacing.xl,
	},
	depotStrip: {
		gap: spacing.base,
		paddingBottom: spacing.sm,
	},
	depotLoading: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		paddingVertical: spacing.base,
	},
	depotLoadingText: {
		...typography.caption,
		color: colors.textSecondary,
	},
	depotError: {
		paddingVertical: spacing.sm,
	},
	depotEmpty: {
		backgroundColor: colors.surface,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		borderStyle: 'dashed',
		padding: spacing.base,
	},
	depotEmptyText: {
		...typography.caption,
		color: colors.textSecondary,
		textAlign: 'center',
	},

	// ── FAB ───────────────────────────────────────────────────────────────────
	fab: {
		position: 'absolute',
		// bottom is set inline via useSafeAreaInsets — see component
		right: spacing.lg,
		backgroundColor: colors.primary,
		borderRadius: 28,
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: spacing.base,
		paddingHorizontal: spacing.lg,
		gap: spacing.xs,
		// Shadow
		shadowColor: colors.primaryDark,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.28,
		shadowRadius: 8,
		elevation: 6,
		minHeight: 52,
	},
	fabPlus: {
		fontSize: 20,
		fontWeight: '700',
		color: colors.white,
		lineHeight: 22,
	},
	fabLabel: {
		...typography.bodyBold,
		color: colors.white,
	},
})

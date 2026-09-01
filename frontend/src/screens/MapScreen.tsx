import React, { useRef, useMemo, useCallback, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import {
	Map,
	Camera,
	Marker,
	type CameraProps,
} from '@maplibre/maplibre-react-native'
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/AppNavigator'
import { useSites } from '../hooks/useSites'
import { useDepots } from '../hooks/useDepots'
import { useDamagedRoads } from '../hooks/useRoads'
import { useAuth } from '../context/AuthContext'
import SiteCard from '../components/SiteCard'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorInline from '../components/ErrorInline'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'
import { Site } from '../types'

// Rajanpur / Southern Punjab default centre
const DEFAULT_CENTER: CameraProps['initialViewState'] = {
	center: [70.33, 29.1],
	zoom: 9,
}

// OpenFreeMap — free, no API key, full OSM data
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

type Props = NativeStackScreenProps<RootStackParamList, 'Map'>

export default function MapScreen({ navigation }: Props) {
	const { session } = useAuth()
	const sites = useSites()
	const depots = useDepots()
	const damagedRoads = useDamagedRoads()

	const [selectedSite, setSelectedSite] = useState<Site | null>(null)
	const [showDamagedRoads, setShowDamagedRoads] = useState(false)
	const [showLegend, setShowLegend] = useState(true)

	const bottomSheetRef = useRef<BottomSheet>(null)
	const snapPoints = useMemo(() => ['50%'], [])

	const handleMarkerPress = useCallback((site: Site) => {
		setSelectedSite(site)
		bottomSheetRef.current?.expand()
	}, [])

	/** Determine marker colour from urgency flags, falling back to priority_score. */
	const getMarkerColor = useCallback((site: Site): string => {
		const flags = site.urgency_flags
		if (
			flags.includes('mass_casualty') ||
			flags.includes('critical_medical') ||
			flags.includes('injury_reported') ||
			flags.includes('pregnancy') ||
			flags.includes('fire')
		) {
			return colors.urgencyCritical
		}
		if (
			flags.includes('water_rising') ||
			flags.includes('stranded_no_exit') ||
			flags.includes('infrastructure_collapse') ||
			flags.includes('flooding')
		) {
			return colors.urgencyHigh
		}
		if (
			flags.includes('elderly_present') ||
			flags.includes('children_present') ||
			flags.includes('trapped_persons')
		) {
			return colors.urgencyMedium
		}
		// Fall back to priority_score banding
		if (site.priority_score >= 0.5) return colors.urgencyHigh
		return colors.urgencyLow
	}, [])

	// Suppress unused-session lint — session flows through child hooks
	void session

	if (sites.isLoading || depots.isLoading) {
		return <LoadingSpinner />
	}

	const hasDataError = sites.isError || depots.isError

	return (
		<View style={styles.container}>
			<Map
				style={StyleSheet.absoluteFill}
				mapStyle={MAP_STYLE}
				attribution={false}
				logo={false}
			>
				<Camera initialViewState={DEFAULT_CENTER} />

				{/* Site markers */}
				{sites.data?.map((site) => (
					<Marker
						key={`site-${site.id}`}
						lngLat={[site.lng, site.lat]}
						onPress={() => handleMarkerPress(site)}
						anchor="center"
					>
						<View
							style={[
								styles.siteMarker,
								{ backgroundColor: getMarkerColor(site) },
							]}
						>
							<View style={styles.siteMarkerInner} />
						</View>
					</Marker>
				))}

				{/* Depot markers */}
				{depots.data?.map((depot) => (
					<Marker
						key={`depot-${depot.id}`}
						lngLat={[depot.lng, depot.lat]}
						anchor="center"
					>
						<View style={styles.depotMarker}>
							<View style={styles.depotMarkerInner} />
						</View>
					</Marker>
				))}

				{/* Damaged road markers */}
				{showDamagedRoads &&
					damagedRoads.data?.map((road) => (
						<Marker
							key={`road-${road.id}`}
							lngLat={[road.lng, road.lat]}
							anchor="center"
						>
							<View style={styles.roadDamageMarker}>
								<Text style={styles.roadDamageIcon}>✕</Text>
							</View>
						</Marker>
					))}
			</Map>

			{/* ── Top controls ───────────────────────────────────────────── */}
			<SafeAreaView style={styles.topControls} edges={['top']}>
				{/* Data-error banner */}
				{hasDataError && (
					<View style={styles.errorBanner}>
						<ErrorInline
							message="Some map data failed to load"
							onRetry={() => {
								sites.refetch()
								depots.refetch()
							}}
						/>
					</View>
				)}

				<View style={styles.controlRow}>
					{/* Damaged roads toggle */}
					<TouchableOpacity
						style={[
							styles.toggleButton,
							showDamagedRoads && styles.toggleButtonActive,
						]}
						onPress={() => setShowDamagedRoads((v) => !v)}
						accessibilityRole="switch"
						accessibilityState={{ checked: showDamagedRoads }}
						accessibilityLabel={
							showDamagedRoads
								? 'Hide damaged roads'
								: 'Show damaged roads'
						}
					>
						<Text
							style={[
								styles.toggleText,
								showDamagedRoads && styles.toggleTextActive,
							]}
						>
							{showDamagedRoads
								? '✕  Hide Damaged Roads'
								: '⚠  Damaged Roads'}
						</Text>
					</TouchableOpacity>

					{/* Legend toggle */}
					<TouchableOpacity
						style={styles.legendToggle}
						onPress={() => setShowLegend((v) => !v)}
						accessibilityRole="button"
						accessibilityLabel={
							showLegend ? 'Hide map legend' : 'Show map legend'
						}
					>
						<Text style={styles.legendToggleText}>
							{showLegend ? 'Hide Legend' : 'Legend'}
						</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>

			{/* ── Legend panel ───────────────────────────────────────────── */}
			{showLegend && (
				<View style={styles.legend}>
					<Text style={styles.legendTitle}>Map Legend</Text>

					<View style={styles.legendItem}>
						<View
							style={[
								styles.legendMarker,
								{
									backgroundColor: colors.urgencyCritical,
									borderRadius: 10,
								},
							]}
						/>
						<Text style={styles.legendLabel}>
							Critical / Medical
						</Text>
					</View>
					<View style={styles.legendItem}>
						<View
							style={[
								styles.legendMarker,
								{
									backgroundColor: colors.urgencyHigh,
									borderRadius: 10,
								},
							]}
						/>
						<Text style={styles.legendLabel}>High Priority</Text>
					</View>
					<View style={styles.legendItem}>
						<View
							style={[
								styles.legendMarker,
								{
									backgroundColor: colors.urgencyMedium,
									borderRadius: 10,
								},
							]}
						/>
						<Text style={styles.legendLabel}>Medium Priority</Text>
					</View>
					<View style={styles.legendItem}>
						<View
							style={[
								styles.legendMarker,
								{
									backgroundColor: colors.urgencyLow,
									borderRadius: 10,
								},
							]}
						/>
						<Text style={styles.legendLabel}>Low Priority</Text>
					</View>

					<View style={styles.legendDivider} />

					<View style={styles.legendItem}>
						<View
							style={[
								styles.legendMarker,
								{
									backgroundColor: colors.primary,
									borderRadius: 4,
								},
							]}
						/>
						<Text style={styles.legendLabel}>Depot</Text>
					</View>
					{showDamagedRoads && (
						<View style={styles.legendItem}>
							<View
								style={[
									styles.legendMarker,
									{
										backgroundColor: colors.errorLight,
										borderRadius: 10,
										borderWidth: 1.5,
										borderColor: colors.error,
									},
								]}
							>
								<Text
									style={{
										fontSize: 8,
										color: colors.error,
										fontWeight: '700',
									}}
								>
									✕
								</Text>
							</View>
							<Text style={styles.legendLabel}>Road Damage</Text>
						</View>
					)}
				</View>
			)}

			{/* ── Bottom sheet ───────────────────────────────────────────── */}
			<BottomSheet
				ref={bottomSheetRef}
				index={-1}
				snapPoints={snapPoints}
				enablePanDownToClose
				backgroundStyle={styles.sheetBackground}
				handleIndicatorStyle={styles.sheetHandle}
			>
				<BottomSheetView style={styles.sheetContent}>
					{selectedSite !== null && (
						<>
							<SiteCard site={selectedSite} />
							<TouchableOpacity
								style={styles.viewPlanButton}
								onPress={() => {
									bottomSheetRef.current?.close()
									navigation.navigate('AllocationPlan')
								}}
								accessibilityRole="button"
								accessibilityLabel="View this site in the allocation plan"
							>
								<Text style={styles.viewPlanButtonText}>
									View in Allocation Plan →
								</Text>
							</TouchableOpacity>
						</>
					)}
				</BottomSheetView>
			</BottomSheet>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1 },

	// ── Markers ────────────────────────────────────────────────────────────────
	siteMarker: {
		width: 22,
		height: 22,
		borderRadius: 11,
		borderWidth: 2.5,
		borderColor: colors.white,
		alignItems: 'center',
		justifyContent: 'center',
		// Shadow for contrast over tiles
		shadowColor: colors.black,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.35,
		shadowRadius: 2,
		elevation: 3,
	},
	siteMarkerInner: {
		width: 7,
		height: 7,
		borderRadius: 3.5,
		backgroundColor: 'rgba(255,255,255,0.75)',
	},
	depotMarker: {
		width: 22,
		height: 22,
		borderRadius: 5,
		backgroundColor: colors.primary,
		borderWidth: 2.5,
		borderColor: colors.white,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: colors.black,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.3,
		shadowRadius: 2,
		elevation: 3,
	},
	depotMarkerInner: {
		width: 6,
		height: 6,
		borderRadius: 1.5,
		backgroundColor: 'rgba(255,255,255,0.85)',
	},
	roadDamageMarker: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: 'rgba(198,40,40,0.18)',
		borderWidth: 2,
		borderColor: colors.error,
		alignItems: 'center',
		justifyContent: 'center',
	},
	roadDamageIcon: {
		fontSize: 11,
		color: colors.error,
		fontWeight: '700',
	},

	// ── Top controls ──────────────────────────────────────────────────────────
	topControls: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.sm,
		gap: spacing.sm,
	},
	errorBanner: {
		backgroundColor: colors.surface,
		borderRadius: 8,
		paddingHorizontal: spacing.base,
		paddingVertical: spacing.sm,
		borderWidth: 1,
		borderColor: colors.border,
	},
	controlRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
	},
	toggleButton: {
		backgroundColor: colors.surface,
		borderRadius: 20,
		paddingHorizontal: spacing.base,
		paddingVertical: spacing.sm,
		borderWidth: 1,
		borderColor: colors.border,
		elevation: 3,
		shadowColor: colors.black,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.12,
		shadowRadius: 3,
		minHeight: 40,
		justifyContent: 'center',
	},
	toggleButtonActive: {
		backgroundColor: colors.primaryDark,
		borderColor: colors.primaryDark,
	},
	toggleText: {
		...typography.caption,
		color: colors.textPrimary,
		fontWeight: '600',
	},
	toggleTextActive: { color: colors.white },

	legendToggle: {
		backgroundColor: colors.surface,
		borderRadius: 20,
		paddingHorizontal: spacing.base,
		paddingVertical: spacing.sm,
		borderWidth: 1,
		borderColor: colors.border,
		elevation: 3,
		shadowColor: colors.black,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.12,
		shadowRadius: 3,
		minHeight: 40,
		justifyContent: 'center',
	},
	legendToggleText: {
		...typography.caption,
		color: colors.primary,
		fontWeight: '600',
	},

	// ── Legend panel ──────────────────────────────────────────────────────────
	legend: {
		position: 'absolute',
		bottom: spacing.xxxl,
		left: spacing.lg,
		backgroundColor: colors.surface,
		borderRadius: 10,
		padding: spacing.base,
		borderWidth: 1,
		borderColor: colors.border,
		gap: spacing.sm,
		minWidth: 160,
		// Shadow
		shadowColor: colors.black,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.12,
		shadowRadius: 4,
		elevation: 4,
	},
	legendTitle: {
		...typography.captionBold,
		color: colors.textSecondary,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: spacing.xs,
	},
	legendItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
	},
	legendMarker: {
		width: 14,
		height: 14,
		alignItems: 'center',
		justifyContent: 'center',
	},
	legendLabel: {
		...typography.caption,
		color: colors.textPrimary,
	},
	legendDivider: {
		height: 1,
		backgroundColor: colors.border,
		marginVertical: spacing.xs,
	},

	// ── Bottom sheet ──────────────────────────────────────────────────────────
	sheetBackground: {
		backgroundColor: colors.surface,
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
	},
	sheetHandle: {
		backgroundColor: colors.gray300,
		width: 36,
	},
	sheetContent: {
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.sm,
		paddingBottom: spacing.xl,
	},
	viewPlanButton: {
		marginTop: spacing.base,
		backgroundColor: colors.primaryLight,
		borderRadius: 8,
		paddingVertical: spacing.base,
		paddingHorizontal: spacing.lg,
		alignItems: 'center',
		minHeight: 48,
		justifyContent: 'center',
	},
	viewPlanButtonText: {
		...typography.bodyBold,
		color: colors.primary,
	},
})

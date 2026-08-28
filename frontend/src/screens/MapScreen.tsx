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
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'
import { Site } from '../types'

// Coordinates in MapLibre use [Longitude, Latitude] format
const DEFAULT_CENTER: CameraProps['initialViewState'] = {
	center: [70.33, 29.1],
	zoom: 9,
}

// OpenFreeMap — free, no API key, full OSM data (cities, roads, buildings).
// "liberty" style is clean and well-maintained. Alternatives: "bright", "dark".
// https://openfreemap.org
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

type Props = NativeStackScreenProps<RootStackParamList, 'Map'>

export default function MapScreen({ navigation }: Props) {
	const { session } = useAuth()
	const sites = useSites()
	const depots = useDepots()
	const damagedRoads = useDamagedRoads()

	const [selectedSite, setSelectedSite] = useState<Site | null>(null)
	const [showDamagedRoads, setShowDamagedRoads] = useState(false)

	const bottomSheetRef = useRef<BottomSheet>(null)
	const snapPoints = useMemo(() => ['45%'], [])

	const handleMarkerPress = useCallback((site: Site) => {
		setSelectedSite(site)
		bottomSheetRef.current?.expand()
	}, [])

	const getMarkerColor = useCallback((site: Site): string => {
		if (
			site.urgency_flags.includes('injury_reported') ||
			site.urgency_flags.includes('pregnancy')
		) {
			return colors.urgencyCritical
		}
		if (
			site.urgency_flags.includes('water_rising') ||
			site.urgency_flags.includes('stranded_no_exit')
		) {
			return colors.urgencyHigh
		}
		if (
			site.urgency_flags.includes('elderly_present') ||
			site.urgency_flags.includes('children_present')
		) {
			return colors.urgencyMedium
		}
		return colors.urgencyLow
	}, [])

	// Suppress the unused-session warning — session is used by child hooks
	void session

	if (sites.isLoading || depots.isLoading) {
		return <LoadingSpinner />
	}

	return (
		<View style={styles.container}>
			<Map
				style={StyleSheet.absoluteFill}
				mapStyle={MAP_STYLE}
				attribution={false}
				logo={false}
			>
				<Camera initialViewState={DEFAULT_CENTER} />

				{/* Site Markers */}
				{sites.data?.map((site) => (
					<Marker
						key={`site-marker-${site.id}`}
						lngLat={[site.lng, site.lat]}
						onPress={() => handleMarkerPress(site)}
						anchor="center"
					>
						<View
							style={[
								styles.markerDot,
								{ backgroundColor: getMarkerColor(site) },
							]}
						/>
					</Marker>
				))}

				{/* Depot Markers */}
				{depots.data?.map((depot) => (
					<Marker
						key={`depot-marker-${depot.id}`}
						lngLat={[depot.lng, depot.lat]}
						anchor="center"
					>
						<View
							style={[
								styles.markerSquare,
								{ backgroundColor: colors.primary },
							]}
						/>
					</Marker>
				))}

				{/* Damaged Roads Overlay */}
				{showDamagedRoads &&
					damagedRoads.data?.map((road) => (
						<Marker
							key={`road-damage-${road.id}`}
							lngLat={[road.lng, road.lat]}
							anchor="center"
						>
							<View style={styles.roadDamageCircle} />
						</Marker>
					))}
			</Map>

			{/* Toggle Button */}
			<SafeAreaView style={styles.topControls} edges={['top']}>
				<TouchableOpacity
					style={[
						styles.toggleButton,
						showDamagedRoads && styles.toggleButtonActive,
					]}
					onPress={() => setShowDamagedRoads((v) => !v)}
					accessibilityRole="button"
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
							? 'Hide Damaged Roads'
							: 'Show Damaged Roads'}
					</Text>
				</TouchableOpacity>
			</SafeAreaView>

			{/* Bottom Sheet */}
			<BottomSheet
				ref={bottomSheetRef}
				index={-1}
				snapPoints={snapPoints}
				enablePanDownToClose
				backgroundStyle={styles.sheetBackground}
			>
				<BottomSheetView style={styles.sheetContent}>
					{selectedSite !== null && (
						<>
							<SiteCard site={selectedSite} />
							<TouchableOpacity
								style={styles.viewPlanLink}
								onPress={() => {
									bottomSheetRef.current?.close()
									navigation.navigate('AllocationPlan')
								}}
								accessibilityRole="button"
								accessibilityLabel="View in plan"
							>
								<Text style={styles.viewPlanText}>
									View in Plan →
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
	markerDot: {
		width: 16,
		height: 16,
		borderRadius: 8,
		borderWidth: 2,
		borderColor: colors.white,
	},
	markerSquare: {
		width: 18,
		height: 18,
		borderRadius: 4,
		borderWidth: 2,
		borderColor: colors.white,
	},
	roadDamageCircle: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: 'rgba(211, 47, 47, 0.3)',
		borderWidth: 2,
		borderColor: colors.error,
	},
	topControls: {
		position: 'absolute',
		top: 0,
		right: 0,
		left: 0,
		alignItems: 'flex-end',
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.sm,
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
		shadowOpacity: 0.15,
		shadowRadius: 2,
	},
	toggleButtonActive: {
		backgroundColor: colors.primary,
		borderColor: colors.primary,
	},
	toggleText: { ...typography.caption, color: colors.textPrimary },
	toggleTextActive: { color: colors.white },
	sheetBackground: { backgroundColor: colors.surface },
	sheetContent: {
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.base,
		paddingBottom: spacing.xl,
	},
	viewPlanLink: {
		marginTop: spacing.base,
		alignSelf: 'flex-end',
		minHeight: 48,
		justifyContent: 'center',
	},
	viewPlanText: { ...typography.bodyBold, color: colors.primary },
})

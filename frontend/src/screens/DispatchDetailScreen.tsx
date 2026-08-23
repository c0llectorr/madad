import React, { useMemo } from 'react'
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Alert,
	Share,
	ActivityIndicator,
	StyleSheet as RNStyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import {
	Map,
	Camera,
	GeoJSONSource,
	Layer,
	Marker,
	type LngLatBounds,
	type CameraProps,
} from '@maplibre/maplibre-react-native'
import { RootStackParamList } from '../navigation/AppNavigator'
import { useUpdateDispatchStatus } from '../hooks/useDispatch'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'
import { DispatchStatus } from '../types'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

/**
 * Derive [west, south, east, north] bounds from a LineString, with padding,
 * so the camera auto-fits the entire route on first render.
 * LngLatBounds = [west, south, east, north] flat 4-tuple per MapLibre v11.
 */
function routeBounds(coords: number[][]): LngLatBounds {
	let minLng = coords[0][0]
	let maxLng = coords[0][0]
	let minLat = coords[0][1]
	let maxLat = coords[0][1]
	for (const [lng, lat] of coords) {
		if (lng < minLng) minLng = lng
		if (lng > maxLng) maxLng = lng
		if (lat < minLat) minLat = lat
		if (lat > maxLat) maxLat = lat
	}
	const pad = 0.015
	return [
		minLng - pad,
		minLat - pad,
		maxLng + pad,
		maxLat + pad,
	] as LngLatBounds
}

type Props = NativeStackScreenProps<RootStackParamList, 'DispatchDetail'>

export default function DispatchDetailScreen({ route }: Props) {
	const { dispatch, depot, site } = route.params
	const updateStatus = useUpdateDispatchStatus()
	const [currentStatus, setCurrentStatus] = React.useState<DispatchStatus>(
		dispatch.status
	)

	// GeoJSON FeatureCollection wrapping the backend-provided route LineString.
	// The LineString coordinates follow actual OSM road edges — accuracy depends
	// on the backend's demo_region.graphml covering the dispatch area.
	const routeGeoJSON = useMemo(
		() => ({
			type: 'FeatureCollection' as const,
			features: [
				{
					type: 'Feature' as const,
					geometry: dispatch.route.geojson,
					properties: {},
				},
			],
		}),
		[dispatch.route.geojson]
	)

	// Camera: fit the full route bounding box with padding on all sides.
	const cameraInitialState = useMemo((): CameraProps['initialViewState'] => {
		const coords = dispatch.route.geojson.coordinates
		if (coords.length < 2) {
			// Fallback: centre on the site if route has no geometry
			return { center: [site.lng, site.lat], zoom: 12 }
		}
		return {
			bounds: routeBounds(coords),
			padding: { top: 40, right: 40, bottom: 40, left: 40 },
		}
	}, [dispatch.route.geojson.coordinates, site.lat, site.lng])

	const handleUpdateStatus = async (newStatus: 'en_route' | 'delivered') => {
		try {
			const result = await updateStatus.mutateAsync({
				dispatchId: dispatch.dispatch_id,
				status: newStatus,
			})
			setCurrentStatus(result.status)
		} catch (err: unknown) {
			const detail = (
				err as { response?: { data?: { detail?: string } } }
			)?.response?.data?.detail
			Alert.alert(
				'Update Failed',
				detail ?? 'Could not update dispatch status.'
			)
		}
	}

	const handleShare = async () => {
		await Share.share({
			title: `Dispatch Order #${dispatch.dispatch_id}`,
			message:
				`MADAD Dispatch #${dispatch.dispatch_id}\n` +
				`Status: ${currentStatus.toUpperCase().replace('_', ' ')}\n` +
				`From: ${depot.name}\n` +
				`To: ${site.location_name}\n` +
				`ETA: ${dispatch.eta_minutes} minutes\n` +
				`Distance: ${dispatch.route.distance_km} km\n` +
				`Generated: ${new Date().toLocaleString()}`,
		})
	}

	const isPending = updateStatus.isPending

	return (
		<SafeAreaView style={styles.container} edges={['bottom']}>
			<ScrollView contentContainerStyle={styles.scrollContent}>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.dispatchId}>
						Dispatch #{dispatch.dispatch_id}
					</Text>
					<View
						style={[
							styles.statusBadge,
							getStatusStyle(currentStatus),
						]}
					>
						<Text style={styles.statusText}>
							{currentStatus.replace('_', ' ').toUpperCase()}
						</Text>
					</View>
				</View>

				{/* From / To */}
				<View style={styles.routeRow}>
					<View style={styles.routeEndpoint}>
						<View
							style={[
								styles.endpointDot,
								{ backgroundColor: colors.primary },
							]}
						/>
						<View style={styles.routeEndpointText}>
							<Text style={styles.endpointLabel}>FROM</Text>
							<Text style={styles.endpointName} numberOfLines={1}>
								{depot.name}
							</Text>
						</View>
					</View>
					<View style={styles.routeArrow}>
						<Text style={styles.routeArrowText}>→</Text>
					</View>
					<View style={styles.routeEndpoint}>
						<View
							style={[
								styles.endpointDot,
								{ backgroundColor: colors.urgencyCritical },
							]}
						/>
						<View style={styles.routeEndpointText}>
							<Text style={styles.endpointLabel}>TO</Text>
							<Text style={styles.endpointName} numberOfLines={1}>
								{site.location_name}
							</Text>
						</View>
					</View>
				</View>

				{/* ETA & distance */}
				<View style={styles.infoRow}>
					<View style={styles.infoBlock}>
						<Text style={styles.infoLabel}>ETA</Text>
						<Text style={styles.infoValue}>
							{dispatch.eta_minutes} min
						</Text>
					</View>
					<View style={styles.infoBlock}>
						<Text style={styles.infoLabel}>Distance</Text>
						<Text style={styles.infoValue}>
							{dispatch.route.distance_km} km
						</Text>
					</View>
				</View>

				{/* Route map */}
				<View style={styles.mapContainer}>
					<Map
						style={RNStyleSheet.absoluteFill}
						mapStyle={MAP_STYLE}
						attribution={false}
						logo={false}
					>
						<Camera initialViewState={cameraInitialState} />

						{/* Road-accurate route polyline from backend OSM graph */}
						<GeoJSONSource id="route-source" data={routeGeoJSON}>
							{/* White casing for contrast over any tile background */}
							<Layer
								id="route-casing"
								type="line"
								style={{
									lineColor: colors.white,
									lineWidth: 7,
									lineCap: 'round',
									lineJoin: 'round',
								}}
							/>
							{/* Primary route line */}
							<Layer
								id="route-line"
								type="line"
								style={{
									lineColor: colors.primary,
									lineWidth: 4,
									lineCap: 'round',
									lineJoin: 'round',
								}}
							/>
						</GeoJSONSource>

						{/* Depot origin marker (blue square) */}
						<Marker lngLat={[depot.lng, depot.lat]} anchor="center">
							<View style={styles.markerDepot} />
						</Marker>

						{/* Site destination marker (red circle) */}
						<Marker lngLat={[site.lng, site.lat]} anchor="center">
							<View style={styles.markerSite} />
						</Marker>
					</Map>

					{/* Map legend — overlaid bottom-left */}
					<View style={styles.mapLegend}>
						<View style={styles.legendItem}>
							<View
								style={[
									styles.legendDot,
									{ backgroundColor: colors.primary },
								]}
							/>
							<Text style={styles.legendText}>Depot</Text>
						</View>
						<View style={styles.legendItem}>
							<View
								style={[
									styles.legendDot,
									{ backgroundColor: colors.urgencyCritical },
								]}
							/>
							<Text style={styles.legendText}>Site</Text>
						</View>
					</View>
				</View>

				{/* Status lifecycle buttons */}
				{currentStatus === 'planned' && (
					<TouchableOpacity
						style={[
							styles.statusButton,
							{ backgroundColor: colors.statusEnRoute },
						]}
						onPress={() => handleUpdateStatus('en_route')}
						disabled={isPending}
						accessibilityRole="button"
						accessibilityLabel="Mark dispatch as en route"
					>
						{isPending ? (
							<ActivityIndicator color={colors.white} />
						) : (
							<Text style={styles.statusButtonText}>
								Mark En Route
							</Text>
						)}
					</TouchableOpacity>
				)}

				{currentStatus === 'en_route' && (
					<TouchableOpacity
						style={[
							styles.statusButton,
							{ backgroundColor: colors.statusDelivered },
						]}
						onPress={() => handleUpdateStatus('delivered')}
						disabled={isPending}
						accessibilityRole="button"
						accessibilityLabel="Mark dispatch as delivered"
					>
						{isPending ? (
							<ActivityIndicator color={colors.white} />
						) : (
							<Text style={styles.statusButtonText}>
								Mark Delivered
							</Text>
						)}
					</TouchableOpacity>
				)}

				{currentStatus === 'delivered' && (
					<View style={styles.deliveredNote}>
						<Text style={styles.deliveredNoteText}>
							Delivery confirmed.
						</Text>
					</View>
				)}
			</ScrollView>

			{/* Share */}
			<View style={styles.footer}>
				<TouchableOpacity
					style={styles.shareButton}
					onPress={handleShare}
					accessibilityRole="button"
					accessibilityLabel="Share dispatch summary"
				>
					<Text style={styles.shareButtonText}>Share Summary</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	)
}

function getStatusStyle(status: DispatchStatus) {
	switch (status) {
		case 'planned':
			return {
				backgroundColor: colors.infoLight,
				borderColor: colors.info,
			}
		case 'en_route':
			return {
				backgroundColor: colors.warningLight,
				borderColor: colors.warning,
			}
		case 'delivered':
			return {
				backgroundColor: colors.successLight,
				borderColor: colors.success,
			}
	}
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.background },
	scrollContent: {
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.base,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: spacing.base,
	},
	dispatchId: { ...typography.heading },
	statusBadge: {
		borderRadius: 12,
		paddingHorizontal: spacing.base,
		paddingVertical: spacing.xs,
		borderWidth: 1,
	},
	statusText: { ...typography.captionBold },
	routeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.base,
		marginBottom: spacing.base,
		gap: spacing.sm,
	},
	routeEndpoint: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
	},
	endpointDot: {
		width: 12,
		height: 12,
		borderRadius: 6,
		flexShrink: 0,
	},
	routeEndpointText: { flex: 1 },
	endpointLabel: {
		...typography.caption,
		color: colors.textSecondary,
		fontWeight: '600',
	},
	endpointName: { ...typography.bodyBold },
	routeArrow: { paddingHorizontal: spacing.xs },
	routeArrowText: {
		...typography.bodyBold,
		color: colors.textSecondary,
	},
	infoRow: {
		flexDirection: 'row',
		gap: spacing.base,
		marginBottom: spacing.base,
	},
	infoBlock: {
		flex: 1,
		backgroundColor: colors.surface,
		borderRadius: 8,
		padding: spacing.base,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: 'center',
	},
	infoLabel: { ...typography.caption },
	infoValue: { ...typography.heading, marginTop: spacing.xs },
	mapContainer: {
		height: 260,
		borderRadius: 10,
		overflow: 'hidden',
		marginBottom: spacing.xl,
		backgroundColor: colors.gray200,
	},
	mapLegend: {
		position: 'absolute',
		bottom: spacing.sm,
		left: spacing.sm,
		backgroundColor: 'rgba(255,255,255,0.9)',
		borderRadius: 6,
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
		gap: spacing.xs,
	},
	legendItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.xs,
	},
	legendDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	legendText: { ...typography.caption, color: colors.textPrimary },
	markerDepot: {
		width: 16,
		height: 16,
		borderRadius: 3,
		backgroundColor: colors.primary,
		borderWidth: 2,
		borderColor: colors.white,
	},
	markerSite: {
		width: 18,
		height: 18,
		borderRadius: 9,
		backgroundColor: colors.urgencyCritical,
		borderWidth: 2,
		borderColor: colors.white,
	},
	statusButton: {
		borderRadius: 8,
		height: 48,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: spacing.base,
	},
	statusButtonText: { ...typography.bodyBold, color: colors.white },
	deliveredNote: {
		backgroundColor: colors.successLight,
		borderRadius: 8,
		padding: spacing.base,
		alignItems: 'center',
	},
	deliveredNoteText: { ...typography.bodyBold, color: colors.success },
	footer: {
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.base,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		backgroundColor: colors.surface,
	},
	shareButton: {
		borderRadius: 8,
		height: 48,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: colors.primary,
	},
	shareButtonText: { ...typography.bodyBold, color: colors.primary },
})

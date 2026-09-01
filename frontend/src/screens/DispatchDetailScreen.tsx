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
 * Compute [west, south, east, north] bounds from a LineString with padding,
 * so the camera auto-fits the full route on first render.
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
	const { dispatch, depot, site, resources } = route.params
	const updateStatus = useUpdateDispatchStatus()
	const [currentStatus, setCurrentStatus] = React.useState<DispatchStatus>(
		dispatch.status
	)

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

	const cameraInitialState = useMemo((): CameraProps['initialViewState'] => {
		const coords = dispatch.route.geojson.coordinates
		if (coords.length < 2) {
			return { center: [site.lng, site.lat], zoom: 12 }
		}
		return {
			bounds: routeBounds(coords),
			padding: { top: 40, right: 40, bottom: 40, left: 40 },
		}
	}, [dispatch.route.geojson.coordinates, site.lat, site.lng])

	const handleUpdateStatus = async (newStatus: 'en_route' | 'delivered') => {
		const label =
			newStatus === 'en_route' ? 'Mark En Route' : 'Mark Delivered'
		const confirmMsg =
			newStatus === 'en_route'
				? 'Confirm that the vehicle has left the depot?'
				: 'Confirm that the delivery has been completed?'

		Alert.alert(label, confirmMsg, [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Confirm',
				onPress: async () => {
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
							detail ??
								'Could not update dispatch status. Please try again.'
						)
					}
				},
			},
		])
	}

	const handleShare = async () => {
		await Share.share({
			title: `Dispatch #${dispatch.dispatch_id}`,
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
	const statusInfo = STATUS_CONFIG[currentStatus]

	return (
		<SafeAreaView style={styles.container} edges={['bottom']}>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{/* ── Header ─────────────────────────────────────────────── */}
				<View style={styles.header}>
					<Text style={styles.dispatchId}>
						Dispatch #{dispatch.dispatch_id}
					</Text>
					<View
						style={[
							styles.statusBadge,
							{
								backgroundColor: statusInfo.bgColor,
								borderColor: statusInfo.borderColor,
							},
						]}
					>
						<View
							style={[
								styles.statusDot,
								{ backgroundColor: statusInfo.dotColor },
							]}
						/>
						<Text
							style={[
								styles.statusText,
								{ color: statusInfo.textColor },
							]}
						>
							{statusInfo.label}
						</Text>
					</View>
				</View>

				{/* ── From / To ──────────────────────────────────────────── */}
				<View style={styles.routeCard}>
					<View style={styles.routeEndpoint}>
						<View
							style={[
								styles.endpointBadge,
								{ backgroundColor: colors.primaryLight },
							]}
						>
							<Text style={styles.endpointBadgeText}>FROM</Text>
						</View>
						<View style={styles.endpointDot} />
						<Text style={styles.endpointName} numberOfLines={2}>
							{depot.name}
						</Text>
					</View>

					<View style={styles.routeConnector}>
						<View style={styles.routeConnectorLine} />
						<Text style={styles.routeConnectorArrow}>↓</Text>
					</View>

					<View style={styles.routeEndpoint}>
						<View
							style={[
								styles.endpointBadge,
								{ backgroundColor: colors.errorLight },
							]}
						>
							<Text
								style={[
									styles.endpointBadgeText,
									{ color: colors.error },
								]}
							>
								TO
							</Text>
						</View>
						<View
							style={[
								styles.endpointDot,
								{ backgroundColor: colors.urgencyCritical },
							]}
						/>
						<Text style={styles.endpointName} numberOfLines={2}>
							{site.location_name}
						</Text>
					</View>
				</View>

				{/* ── ETA / Distance / Resources ─────────────────────────── */}
				<View style={styles.infoGrid}>
					<View style={styles.infoBlock}>
						<Text style={styles.infoLabel}>ETA</Text>
						<Text style={styles.infoValue}>
							{dispatch.eta_minutes} min
						</Text>
					</View>
					<View style={styles.infoBlockDivider} />
					<View style={styles.infoBlock}>
						<Text style={styles.infoLabel}>Distance</Text>
						<Text style={styles.infoValue}>
							{dispatch.route.distance_km} km
						</Text>
					</View>
				</View>

				{/* Resources */}
				<View style={styles.resourcesSection}>
					<Text style={styles.resourcesTitle}>Resources Loaded</Text>
					<View style={styles.resourcesGrid}>
						{resources && resources.length > 0 ? (
							resources.map((r) => (
								<View
									key={r.resource_type}
									style={styles.resourceChip}
								>
									<Text style={styles.resourceQty}>
										{r.quantity}×
									</Text>
									<Text
										style={styles.resourceType}
										numberOfLines={1}
									>
										{r.resource_type.replace(/_/g, ' ')}
									</Text>
								</View>
							))
						) : (
							<Text style={styles.resourcesFallback}>
								No resource details available.
							</Text>
						)}
					</View>
				</View>

				{/* ── Route map ──────────────────────────────────────────── */}
				<View style={styles.mapContainer}>
					<Map
						style={StyleSheet.absoluteFill}
						mapStyle={MAP_STYLE}
						attribution={false}
						logo={false}
					>
						<Camera initialViewState={cameraInitialState} />

						<GeoJSONSource id="route-source" data={routeGeoJSON}>
							{/* White casing for contrast over tile background */}
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
							{/* Route line — primaryDark for clear visibility */}
							<Layer
								id="route-line"
								type="line"
								style={{
									lineColor: colors.primaryDark,
									lineWidth: 4,
									lineCap: 'round',
									lineJoin: 'round',
								}}
							/>
						</GeoJSONSource>

						{/* Depot origin marker */}
						<Marker lngLat={[depot.lng, depot.lat]} anchor="center">
							<View style={styles.mapMarkerDepot} />
						</Marker>

						{/* Site destination marker */}
						<Marker lngLat={[site.lng, site.lat]} anchor="center">
							<View style={styles.mapMarkerSite} />
						</Marker>
					</Map>

					{/* Inline map legend */}
					<View style={styles.mapLegend}>
						<View style={styles.mapLegendItem}>
							<View
								style={[
									styles.mapLegendDot,
									{ backgroundColor: colors.primary },
								]}
							/>
							<Text style={styles.mapLegendText}>Depot</Text>
						</View>
						<View style={styles.mapLegendItem}>
							<View
								style={[
									styles.mapLegendDot,
									{ backgroundColor: colors.urgencyCritical },
								]}
							/>
							<Text style={styles.mapLegendText}>Site</Text>
						</View>
					</View>
				</View>

				{/* ── Status progression buttons ─────────────────────────── */}
				{currentStatus === 'planned' && (
					<TouchableOpacity
						style={[
							styles.statusButton,
							{ backgroundColor: colors.statusEnRoute },
						]}
						onPress={() => handleUpdateStatus('en_route')}
						disabled={isPending}
						accessibilityRole="button"
						accessibilityLabel="Mark dispatch as en route — vehicle has left the depot"
					>
						{isPending ? (
							<ActivityIndicator color={colors.white} />
						) : (
							<>
								<Text style={styles.statusButtonText}>
									Mark En Route
								</Text>
								<Text style={styles.statusButtonSub}>
									Vehicle has left the depot
								</Text>
							</>
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
						accessibilityLabel="Mark dispatch as delivered — aid has reached the site"
					>
						{isPending ? (
							<ActivityIndicator color={colors.white} />
						) : (
							<>
								<Text style={styles.statusButtonText}>
									Mark Delivered
								</Text>
								<Text style={styles.statusButtonSub}>
									Aid has reached the site
								</Text>
							</>
						)}
					</TouchableOpacity>
				)}

				{currentStatus === 'delivered' && (
					<View style={styles.deliveredNote}>
						<Text style={styles.deliveredNoteIcon}>✓</Text>
						<View>
							<Text style={styles.deliveredNoteTitle}>
								Delivery Confirmed
							</Text>
							<Text style={styles.deliveredNoteBody}>
								This dispatch has been completed.
							</Text>
						</View>
					</View>
				)}
			</ScrollView>

			{/* ── Share footer ───────────────────────────────────────────── */}
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

// ── Status configuration ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
	DispatchStatus,
	{
		label: string
		bgColor: string
		borderColor: string
		dotColor: string
		textColor: string
	}
> = {
	planned: {
		label: 'Planned',
		bgColor: colors.infoLight,
		borderColor: colors.info,
		dotColor: colors.info,
		textColor: colors.info,
	},
	en_route: {
		label: 'En Route',
		bgColor: colors.warningLight,
		borderColor: colors.warning,
		dotColor: colors.warning,
		textColor: colors.warning,
	},
	delivered: {
		label: 'Delivered',
		bgColor: colors.successLight,
		borderColor: colors.success,
		dotColor: colors.success,
		textColor: colors.success,
	},
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.background },
	scrollContent: {
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.base,
		paddingBottom: spacing.xxl,
	},

	// ── Header ───────────────────────────────────────────────────────────────
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: spacing.base,
	},
	dispatchId: {
		...typography.heading,
		color: colors.primaryDark,
	},
	statusBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 12,
		paddingHorizontal: spacing.base,
		paddingVertical: spacing.xs,
		borderWidth: 1,
		gap: spacing.xs,
	},
	statusDot: {
		width: 7,
		height: 7,
		borderRadius: 3.5,
	},
	statusText: {
		...typography.captionBold,
		fontSize: 12,
	},

	// ── Route card ────────────────────────────────────────────────────────────
	routeCard: {
		backgroundColor: colors.surface,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.base,
		marginBottom: spacing.base,
	},
	routeEndpoint: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.base,
	},
	endpointBadge: {
		borderRadius: 5,
		paddingHorizontal: spacing.sm,
		paddingVertical: 2,
		minWidth: 44,
		alignItems: 'center',
	},
	endpointBadgeText: {
		fontSize: 10,
		fontWeight: '800',
		color: colors.primary,
		letterSpacing: 0.5,
	},
	endpointDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: colors.primary,
	},
	endpointName: {
		...typography.bodyBold,
		color: colors.textPrimary,
		flex: 1,
	},
	routeConnector: {
		flexDirection: 'row',
		alignItems: 'center',
		marginLeft: 44 + spacing.base,
		marginVertical: spacing.xs,
		gap: spacing.sm,
	},
	routeConnectorLine: {
		width: 1.5,
		height: 16,
		backgroundColor: colors.border,
		marginLeft: 4,
	},
	routeConnectorArrow: {
		...typography.caption,
		color: colors.gray400,
	},

	// ── Info grid ─────────────────────────────────────────────────────────────
	infoGrid: {
		flexDirection: 'row',
		backgroundColor: colors.surface,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.border,
		marginBottom: spacing.base,
		overflow: 'hidden',
	},
	infoBlock: {
		flex: 1,
		padding: spacing.base,
		alignItems: 'center',
	},
	infoBlockDivider: {
		width: 1,
		backgroundColor: colors.border,
		marginVertical: spacing.sm,
	},
	infoLabel: {
		...typography.caption,
		color: colors.textSecondary,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: spacing.xs,
	},
	infoValue: {
		fontSize: 20,
		fontWeight: '700',
		color: colors.primaryDark,
		lineHeight: 26,
	},

	// ── Resources ─────────────────────────────────────────────────────────────
	resourcesSection: {
		backgroundColor: colors.surface,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.base,
		marginBottom: spacing.base,
	},
	resourcesTitle: {
		...typography.captionBold,
		color: colors.textSecondary,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: spacing.sm,
	},
	resourcesGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.sm,
	},
	resourceChip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.primaryLight,
		borderRadius: 8,
		paddingHorizontal: spacing.base,
		paddingVertical: spacing.sm,
		gap: spacing.xs,
	},
	resourceQty: {
		...typography.captionBold,
		color: colors.primaryDark,
	},
	resourceType: {
		...typography.caption,
		color: colors.primary,
		textTransform: 'capitalize',
	},
	resourcesFallback: {
		...typography.caption,
		color: colors.textSecondary,
		fontStyle: 'italic',
	},

	// ── Map ───────────────────────────────────────────────────────────────────
	mapContainer: {
		height: 220,
		borderRadius: 12,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: colors.border,
		marginBottom: spacing.base,
	},
	mapMarkerDepot: {
		width: 16,
		height: 16,
		borderRadius: 4,
		backgroundColor: colors.primary,
		borderWidth: 2,
		borderColor: colors.white,
	},
	mapMarkerSite: {
		width: 16,
		height: 16,
		borderRadius: 8,
		backgroundColor: colors.urgencyCritical,
		borderWidth: 2,
		borderColor: colors.white,
	},
	mapLegend: {
		position: 'absolute',
		bottom: spacing.sm,
		left: spacing.sm,
		backgroundColor: 'rgba(255,255,255,0.92)',
		borderRadius: 8,
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
		gap: 4,
	},
	mapLegendItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.xs,
	},
	mapLegendDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	mapLegendText: {
		fontSize: 11,
		fontWeight: '500',
		color: colors.textPrimary,
	},

	// ── Status buttons ────────────────────────────────────────────────────────
	statusButton: {
		borderRadius: 12,
		padding: spacing.base,
		alignItems: 'center',
		marginBottom: spacing.base,
		minHeight: 64,
		justifyContent: 'center',
	},
	statusButtonText: {
		...typography.bodyBold,
		color: colors.white,
		fontSize: 17,
	},
	statusButtonSub: {
		...typography.caption,
		color: 'rgba(255,255,255,0.80)',
		marginTop: 2,
	},
	deliveredNote: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.successLight,
		borderRadius: 12,
		padding: spacing.base,
		marginBottom: spacing.base,
		borderWidth: 1,
		borderColor: colors.success,
		gap: spacing.base,
	},
	deliveredNoteIcon: {
		fontSize: 24,
		color: colors.success,
		fontWeight: '700',
	},
	deliveredNoteTitle: {
		...typography.bodyBold,
		color: colors.success,
	},
	deliveredNoteBody: {
		...typography.caption,
		color: colors.textSecondary,
	},

	// ── Footer ────────────────────────────────────────────────────────────────
	footer: {
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.base,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		backgroundColor: colors.surface,
	},
	shareButton: {
		height: 50,
		borderRadius: 10,
		borderWidth: 1.5,
		borderColor: colors.primaryDark,
		alignItems: 'center',
		justifyContent: 'center',
	},
	shareButtonText: {
		...typography.bodyBold,
		color: colors.primaryDark,
	},
})

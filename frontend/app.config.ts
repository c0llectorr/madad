import { ExpoConfig, ConfigContext } from 'expo/config'

// Map strategy: @maplibre/maplibre-react-native with demotiles.maplibre.org style.
// Zero-cost, no Google Cloud billing or API keys required.

export default ({ config }: ConfigContext): ExpoConfig => ({
	...config,
	name: 'MADAD',
	slug: 'madad',
	version: '1.0.0',
	runtimeVersion: { policy: 'fingerprint' },
	description: 'Relief coordination for support centers',
	platforms: ['ios', 'android'],
	orientation: 'portrait',
	icon: './assets/images/favicon.png',
	scheme: 'madad',
	ios: {
		supportsTablet: false,
		bundleIdentifier: 'com.madad.madad',
	},
	android: {
		package: 'com.madad.madad',
		adaptiveIcon: {
			backgroundColor: '#E6F4FE',
			foregroundImage: './assets/images/favicon.png',
		},
		predictiveBackGestureEnabled: true,
		permissions: [
			'android.permission.INTERNET',
			'android.permission.ACCESS_NETWORK_STATE',
		],
	},
	plugins: [
		'expo-dev-client',
		[
			'expo-splash-screen',
			{
				image: './assets/images/favicon.png',
				imageWidth: 200,
				resizeMode: 'contain',
				backgroundColor: '#E6F4FE',
			},
		],
		[
			'expo-build-properties',
			{
				android: {
					minSdkVersion: 29,
					compileSdkVersion: 36,
					targetSdkVersion: 36,
					enableShrinkResourcesInReleaseBuilds: true,
					enableMinifyInReleaseBuilds: true,
					enableProguardInReleaseBuilds: true,
					buildArchs: ['arm64-v8a'],
				},
			},
		],
		'expo-router',
		'@maplibre/maplibre-react-native',
	],
	experiments: {
		typedRoutes: true,
		reactCompiler: true,
	},
	owner: 'madad-app',
	updates: {
		url: 'https://u.expo.dev/433dbeee-4ca0-4942-89ca-96aa94eea86f',
		enabled: true,
		fallbackToCacheTimeout: 30000,
		checkAutomatically: 'ON_LOAD',
	},
	extra: {
		eas: {
			projectId: '433dbeee-4ca0-4942-89ca-96aa94eea86f',
		},
	},
})

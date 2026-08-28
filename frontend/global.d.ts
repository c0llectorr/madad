// Global type declarations for the MADAD frontend
// Add project-wide ambient types here as needed

// Expo's Metro bundler statically replaces EXPO_PUBLIC_* variables at build
// time. Declaring them here gives TypeScript visibility without requiring
// @types/node or the full NodeJS namespace.
declare const process: {
	env: {
		EXPO_PUBLIC_API_BASE_URL?: string
		EXPO_PUBLIC_USE_MOCK?: string
		EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?: string
		NODE_ENV?: string
	}
}

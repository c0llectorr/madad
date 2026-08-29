# MADAD Frontend

React Native/Expo mobile application for the MADAD disaster relief coordination system.

## Setup

### 1. Environment Setup

Copy the example environment file and configure it:

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your configuration
# nano .env  # or use your preferred editor
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Or with yarn
yarn install
```

### 3. Configure Environment Variables

Edit the `.env` file with your configuration:

#### Backend API URL
```bash
# For local development (same machine)
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api

# For Android emulator
# EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000/api

# For iOS simulator (same as localhost)
# EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api

# For physical device testing (use your computer's IP)
# EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:8000/api

# For production
# EXPO_PUBLIC_API_BASE_URL=https://your-backend-domain.com/api
```

#### Development Flags
```bash
# Use mock data (no backend required)
EXPO_PUBLIC_USE_MOCK=false

# Enable debug features
EXPO_PUBLIC_ENABLE_DEBUG=true
```

### 4. Start the Development Server

```bash
# Start Expo development server
npm start

# Or with yarn
yarn start
```

### 5. Run on Devices

#### Android
```bash
# Android emulator
npm run android

# Physical Android device
# Scan QR code from Expo Go app
```

#### iOS
```bash
# iOS simulator (macOS only)
npm run ios

# Physical iOS device
# Scan QR code from Expo Go app
```

## Environment Variables Reference

### Required Variables
- `EXPO_PUBLIC_API_BASE_URL`: Backend API base URL

### Optional Variables
- `EXPO_PUBLIC_USE_MOCK`: Use mock data instead of real backend
- `EXPO_PUBLIC_ENABLE_DEBUG`: Enable debug features
- `EXPO_PUBLIC_LOG_LEVEL`: Log level (debug, info, warn, error)
- `EXPO_PUBLIC_MAPBOX_API_KEY`: Mapbox API key for advanced mapping
- `EXPO_PUBLIC_MAP_TILE_URL`: Custom map tile URL

## Development

### Project Structure
```
frontend/
├── app/                 # Expo Router entry points
├── src/
│   ├── api/            # API clients
│   ├── components/     # Reusable components
│   ├── context/        # React context providers
│   ├── hooks/          # Custom hooks
│   ├── screens/        # Screen components
│   ├── store/          # Zustand stores
│   ├── types/          # TypeScript types
│   └── validation/     # Zod validation schemas
├── assets/             # Images, fonts, etc.
└── .env.example        # Environment variables template
```

### Key Dependencies
- **Expo**: React Native framework
- **React Navigation**: Navigation library
- **Zustand**: State management
- **React Query**: Data fetching and caching
- **React Hook Form**: Form handling
- **Zod**: Schema validation
- **MapLibre**: Mapping library

### Code Style
- TypeScript for type safety
- Functional components with hooks
- Custom hooks for business logic
- Component composition
- Error boundaries for crash prevention

## Testing

### Run Tests
```bash
# Unit tests
npm test

# Linting
npm run lint

# Formatting
npm run format
```

### Testing on Different Devices
1. **Android Emulator**: Requires Android Studio
2. **iOS Simulator**: Requires Xcode (macOS only)
3. **Physical Devices**: Use Expo Go app

## Troubleshooting

### Backend Connection Issues
1. Verify backend is running: `curl http://localhost:8000/health`
2. Check `EXPO_PUBLIC_API_BASE_URL` in `.env`
3. Ensure no firewall blocking port 8000
4. For physical devices, use computer's IP address

### Build Issues
1. Clear cache: `expo start --clear`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check Node.js version: `node --version` (recommended: 18+)

### Expo Go Issues
1. Ensure Expo Go app is updated
2. Same network for device and computer
3. No VPN interfering with local network

## Deployment

### Building for Production
```bash
# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

### Environment-Specific Builds
Create different `.env` files:
- `.env.development`: Development settings
- `.env.production`: Production settings
- `.env.staging`: Staging settings

### App Store Deployment
1. Update app metadata in `app.config.ts`
2. Configure EAS build profiles
3. Submit to App Store/Play Console

## Security Considerations

1. **Never commit `.env` files** to version control
2. **Use HTTPS** in production for API calls
3. **Validate all user inputs** on both client and server
4. **Secure storage** for sensitive data (tokens, etc.)
5. **Regular dependency updates** for security patches

## Performance Optimization

1. **Image optimization**: Use appropriate sizes and formats
2. **Code splitting**: Lazy load screens and components
3. **Memory management**: Clean up subscriptions and listeners
4. **Network optimization**: Implement caching and retry logic
5. **Bundle size**: Regular analysis and optimization
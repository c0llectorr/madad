import { LoginResponse, Center } from '../types'

export const mockLoginResponse: LoginResponse = {
	access_token: 'mock-jwt-token-dev-only',
	token_type: 'bearer',
	role: 'coordinator',
	center_id: 1,
	center_name: 'Islamabad Relief Center',
}

export const mockAdminLoginResponse: LoginResponse = {
	access_token: 'mock-jwt-token-admin-dev-only',
	token_type: 'bearer',
	role: 'admin',
	center_id: 1,
	center_name: 'Islamabad Relief Center',
}

export const mockCenters: Center[] = [
	{
		id: 1,
		code: 'ISB',
		name: 'Islamabad Relief Center',
		region: 'Federal Capital Territory',
		lat: 33.6844,
		lng: 73.0479,
	},
	{
		id: 2,
		code: 'LHR',
		name: 'Lahore Relief Center',
		region: 'Punjab',
		lat: 31.5204,
		lng: 74.3587,
	},
	{
		id: 3,
		code: 'KHI',
		name: 'Karachi Relief Center',
		region: 'Sindh',
		lat: 24.8607,
		lng: 67.0011,
	},
]

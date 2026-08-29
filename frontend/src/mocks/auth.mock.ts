import { LoginResponse, Center } from '../types'

export const mockLoginResponse: LoginResponse = {
	access_token: 'mock-jwt-token-dev-only',
	token_type: 'bearer',
	role: 'coordinator',
	center_id: 1,
	center_name: 'Rajanpur Support Center',
}

export const mockAdminLoginResponse: LoginResponse = {
	access_token: 'mock-jwt-token-admin-dev-only',
	token_type: 'bearer',
	role: 'admin',
	center_id: 1,
	center_name: 'Rajanpur Support Center',
}

export const mockCenters: Center[] = [
	{
		id: 1,
		code: 'RJP-01',
		name: 'Rajanpur Support Center',
		region: 'Punjab',
		lat: 29.1044,
		lng: 70.3301,
	},
	{
		id: 2,
		code: 'MZF-01',
		name: 'Muzaffargarh Support Center',
		region: 'Punjab',
		lat: 30.0750,
		lng: 71.1800,
	},
]

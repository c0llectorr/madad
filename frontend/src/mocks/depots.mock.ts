import { Depot } from '../types'

export const mockDepots: Depot[] = [
	{
		id: 1,
		name: 'Depot Alpha — Rajanpur',
		lat: 29.08,
		lng: 70.3,
		inventory: [
			{ resource_type: 'food_packet', quantity: 400 },
			{ resource_type: 'water_container', quantity: 300 },
			{ resource_type: 'medicine_kit', quantity: 120 },
			{ resource_type: 'tent', quantity: 50 },
			{ resource_type: 'boat', quantity: 2 },
			{ resource_type: 'ambulance', quantity: 1 },
		],
	},
	{
		id: 2,
		name: 'Depot Beta — Jampur',
		lat: 29.64,
		lng: 70.59,
		inventory: [
			{ resource_type: 'food_packet', quantity: 200 },
			{ resource_type: 'water_container', quantity: 150 },
			{ resource_type: 'medicine_kit', quantity: 80 },
			{ resource_type: 'tent', quantity: 30 },
			{ resource_type: 'ambulance', quantity: 2 },
		],
	},
]

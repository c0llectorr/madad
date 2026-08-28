import { GeneratePlanResponse, ReplanResponse } from '../types'

export const mockPlan: GeneratePlanResponse = {
	allocations: [
		{
			site_id: 1,
			depot_id: 1,
			rank: 1,
			priority_score: 0.92,
			resources: [
				{ resource_type: 'food_packet', quantity: 100 },
				{ resource_type: 'boat', quantity: 1 },
			],
			reasoning:
				'Priority score 0.92: population 200, flags: water_rising, stranded_no_exit. Depot Alpha closest with boat availability.',
		},
		{
			site_id: 2,
			depot_id: 2,
			rank: 2,
			priority_score: 0.87,
			resources: [
				{ resource_type: 'medicine_kit', quantity: 60 },
				{ resource_type: 'ambulance', quantity: 1 },
			],
			reasoning:
				'Priority score 0.87: population 50, flags: injury_reported, elderly_present. Medical urgency — medicine and ambulance prioritized.',
		},
		{
			site_id: 3,
			depot_id: 1,
			rank: 3,
			priority_score: 0.74,
			resources: [
				{ resource_type: 'tent', quantity: 20 },
				{ resource_type: 'water_container', quantity: 80 },
			],
			reasoning:
				'Priority score 0.74: population 120, flags: stranded_no_exit. Shelter and water prioritized. Dispatch already planned.',
		},
		{
			site_id: 4,
			depot_id: 2,
			rank: 4,
			priority_score: 0.55,
			resources: [
				{ resource_type: 'food_packet', quantity: 60 },
				{ resource_type: 'water_container', quantity: 60 },
			],
			reasoning:
				'Priority score 0.55: population 80, severity: medium. No critical urgency flags — lower priority relative to other sites.',
		},
	],
}

export const mockEmptyPlan: GeneratePlanResponse = {
	allocations: [],
	message: 'No unserved sites',
}

export const mockReplanResponse: ReplanResponse = {
	changed: [
		{
			site_id: 4,
			old_rank: 4,
			new_rank: 2,
			reason: 'New report corroborated site — priority score increased to 0.81',
		},
		{
			site_id: 2,
			old_rank: 2,
			new_rank: 3,
			reason: 'Bumped down by higher-scored incoming site',
		},
	],
	unchanged: [1, 3],
}

import {
	ReportListItem,
	ExtractReportResponse,
	CreateReportResponse,
} from '../types'

export const mockReports: ReportListItem[] = [
	{
		report_id: 1,
		raw_text:
			'Village near Kotli bridge flooded, around 200 people stranded, need food and boats urgently',
		status: 'pending_extraction',
		created_at: '2026-08-22T06:15:00Z',
	},
	{
		report_id: 2,
		raw_text:
			'Shelter collapsed in sector 4, families outside, need emergency shelter and medicine',
		status: 'pending_extraction',
		created_at: '2026-08-22T06:45:00Z',
	},
	{
		report_id: 3,
		raw_text:
			'Hospital in Rawat running out of medicines, 50 critical patients',
		status: 'extracted',
		created_at: '2026-08-22T07:00:00Z',
	},
	{
		report_id: 4,
		raw_text: null, // manual report — no raw_text
		status: 'confirmed',
		created_at: '2026-08-22T07:30:00Z',
	},
]

export const mockExtractResponse: ExtractReportResponse = {
	report_id: 1,
	extracted: {
		location_name: 'Kotli Bridge Area',
		estimated_population: 200,
		needs: ['food', 'general_evacuation'],
		urgency_flags: ['flooding', 'trapped_persons'],
		confidence: 'single_unverified',
	},
	geocode_status: 'matched',
}

export const mockExtractUnmatchedResponse: ExtractReportResponse = {
	report_id: 2,
	extracted: {
		location_name: 'Sector 4 (unverified)',
		estimated_population: 40,
		needs: ['shelter', 'medicine'],
		urgency_flags: ['infrastructure_collapse'],
		confidence: 'single_unverified',
	},
	geocode_status: 'unmatched', // triggers pin-drop flow in ReportReviewScreen
}

export const mockCreateReportResponse: CreateReportResponse = {
	report_id: 5,
	status: 'confirmed',
}

import { create } from 'zustand'

interface UIStore {
	// IDs of sites whose allocation row should animate after a replan
	replanChangedSiteIds: number[]
	setReplanChangedSiteIds: (ids: number[]) => void
	clearReplanChangedSiteIds: () => void
}

export const useUIStore = create<UIStore>((set) => ({
	replanChangedSiteIds: [],
	setReplanChangedSiteIds: (ids) => set({ replanChangedSiteIds: ids }),
	clearReplanChangedSiteIds: () => set({ replanChangedSiteIds: [] }),
}))

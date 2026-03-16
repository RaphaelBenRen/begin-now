import { create } from 'zustand';
import api from '../lib/api';

const useStatsStore = create((set) => ({
  stats: null,
  streaks: [],
  isLoading: false,

  fetchStats: async (period = 'week', objectiveId = null) => {
    set({ isLoading: true });
    try {
      const params = { period };
      if (objectiveId) params.objective_id = objectiveId;
      const response = await api.get('/stats', { params });
      set({ stats: response.data, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  fetchStreaks: async () => {
    try {
      const response = await api.get('/stats/streaks');
      set({ streaks: response.data });
    } catch (_) {}
  },
}));

export default useStatsStore;

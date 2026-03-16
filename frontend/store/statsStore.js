import { create } from 'zustand';
import api from '../lib/api';

const useStatsStore = create((set, get) => ({
  // Stats par période : { week: {...}, month: {...}, year: {...} }
  statsByPeriod: {},
  streaks: [],
  isLoading: false,

  // Charger une seule période
  fetchStats: async (period = 'week', objectiveId = null) => {
    set({ isLoading: true });
    try {
      const params = { period };
      if (objectiveId) params.objective_id = objectiveId;
      const response = await api.get('/stats', { params });
      set((state) => ({
        statsByPeriod: { ...state.statsByPeriod, [period]: response.data },
        isLoading: false,
      }));
    } catch (err) {
      set({ isLoading: false });
    }
  },

  // Pré-charger les 3 périodes en parallèle
  fetchAllPeriods: async (objectiveId = null) => {
    // Ne montrer le loading que si aucune donnée n'existe encore
    const hasData = Object.keys(get().statsByPeriod).length > 0;
    if (!hasData) set({ isLoading: true });
    try {
      const periods = ['week', 'month', 'year'];
      const results = await Promise.all(
        periods.map((p) => {
          const params = { period: p };
          if (objectiveId) params.objective_id = objectiveId;
          return api.get('/stats', { params });
        })
      );
      const statsByPeriod = {};
      periods.forEach((p, i) => { statsByPeriod[p] = results[i].data; });
      set({ statsByPeriod, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  // Getter pour la période courante
  getStats: (period) => get().statsByPeriod[period] || null,

  fetchStreaks: async () => {
    try {
      const response = await api.get('/stats/streaks');
      set({ streaks: response.data });
    } catch (_) {}
  },
}));

export default useStatsStore;

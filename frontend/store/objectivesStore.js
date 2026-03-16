import { create } from 'zustand';
import { format } from 'date-fns';
import api from '../lib/api';

const useObjectivesStore = create((set, get) => ({
  objectives: [],
  logsByDate: {},   // { 'YYYY-MM-DD': { [objectiveId]: log } }
  isLoading: false,
  error: null,

  fetchObjectives: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/objectives');
      set({ objectives: response.data, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err.message });
    }
  },

  fetchLogsByDate: async (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    try {
      const response = await api.get('/logs/history', {
        params: { from: dateStr, to: dateStr },
      });
      const logsMap = {};
      response.data.forEach((log) => { logsMap[log.objective_id] = log; });
      set((state) => ({
        logsByDate: { ...state.logsByDate, [dateStr]: logsMap },
      }));
    } catch (_) {}
  },

  getLogsForDate: (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return get().logsByDate[dateStr] || {};
  },

  logObjective: async (objectiveId, status, value = null) => {
    const response = await api.post('/logs', {
      objective_id: objectiveId,
      status,
      value,
    });
    const { log, streak, newBadges } = response.data;
    const today = format(new Date(), 'yyyy-MM-dd');
    set((state) => ({
      logsByDate: {
        ...state.logsByDate,
        [today]: { ...(state.logsByDate[today] || {}), [objectiveId]: log },
      },
      objectives: state.objectives.map((o) =>
        o.id === objectiveId ? { ...o, streak } : o
      ),
    }));
    return { log, streak, newBadges };
  },

  createObjective: async (data) => {
    const response = await api.post('/objectives', data);
    set((state) => ({ objectives: [...state.objectives, response.data] }));
    return response.data;
  },

  updateObjective: async (id, data) => {
    const response = await api.put(`/objectives/${id}`, data);
    set((state) => ({
      objectives: state.objectives.map((o) => (o.id === id ? response.data : o)),
    }));
    return response.data;
  },

  archiveObjective: async (id) => {
    await api.patch(`/objectives/${id}/archive`);
    set((state) => ({
      objectives: state.objectives.filter((o) => o.id !== id),
    }));
  },
}));

export default useObjectivesStore;

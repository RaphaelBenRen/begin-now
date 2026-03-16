import { create } from 'zustand';
import { format } from 'date-fns';
import api from '../lib/api';
import useStatsStore from './statsStore';
import useAuthStore from './authStore';

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
    const today = format(new Date(), 'yyyy-MM-dd');

    // Décochage : supprimer le log du jour
    if (status === null) {
      const response = await api.delete(`/logs/today/${objectiveId}`);
      set((state) => {
        const dayLogs = { ...(state.logsByDate[today] || {}) };
        delete dayLogs[objectiveId];
        return { logsByDate: { ...state.logsByDate, [today]: dayLogs } };
      });
      // Mettre à jour streak si retourné
      if (response.data.streak) {
        set((state) => ({
          objectives: state.objectives.map((o) =>
            o.id === objectiveId ? { ...o, streak: response.data.streak } : o
          ),
        }));
      }
      // Mettre à jour les points
      if (response.data.pointsDelta) {
        const authState = useAuthStore.getState();
        const currentPoints = authState.user?.total_points || authState.profile?.total_points || 0;
        const newPoints = Math.max(0, currentPoints + response.data.pointsDelta);
        if (authState.user) authState.setUser({ ...authState.user, total_points: newPoints });
        if (authState.profile) useAuthStore.setState({ profile: { ...authState.profile, total_points: newPoints } });
      }
      useStatsStore.getState().fetchAllPeriods();
      useStatsStore.getState().fetchStreaks();
      return { log: null, streak: response.data.streak, newBadges: [] };
    }

    // Cochage normal
    const response = await api.post('/logs', {
      objective_id: objectiveId,
      status,
      value,
    });
    const { log, streak, newBadges } = response.data;
    set((state) => ({
      logsByDate: {
        ...state.logsByDate,
        [today]: { ...(state.logsByDate[today] || {}), [objectiveId]: log },
      },
      objectives: state.objectives.map((o) =>
        o.id === objectiveId ? { ...o, streak } : o
      ),
    }));
    // Mettre à jour les points en temps réel
    if (response.data.pointsDelta) {
      const authState = useAuthStore.getState();
      const currentPoints = authState.user?.total_points || authState.profile?.total_points || 0;
      const newPoints = Math.max(0, currentPoints + response.data.pointsDelta);
      if (authState.user) authState.setUser({ ...authState.user, total_points: newPoints });
      if (authState.profile) useAuthStore.setState({ profile: { ...authState.profile, total_points: newPoints } });
    }
    // Rafraîchir stats + streaks en arrière-plan
    useStatsStore.getState().fetchAllPeriods();
    useStatsStore.getState().fetchStreaks();
    return { log, streak, newBadges };
  },

  createObjective: async (data) => {
    const response = await api.post('/objectives', data);
    set((state) => ({ objectives: [...state.objectives, response.data] }));
    // Rafraîchir stats + streaks en arrière-plan
    useStatsStore.getState().fetchAllPeriods();
    useStatsStore.getState().fetchStreaks();
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
    // Rafraîchir le cache stats en arrière-plan
    useStatsStore.getState().fetchAllPeriods();
    useStatsStore.getState().fetchStreaks();
  },
}));

export default useObjectivesStore;

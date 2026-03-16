import { create } from 'zustand';
import api from '../lib/api';

const useObjectivesStore = create((set, get) => ({
  objectives: [],
  todayLogs: {},     // { [objectiveId]: log }
  isLoading: false,

  fetchObjectives: async () => {
    set({ isLoading: true });
    const response = await api.get('/objectives');
    set({ objectives: response.data, isLoading: false });
  },

  fetchTodayLogs: async () => {
    const response = await api.get('/logs/today');
    const logsMap = {};
    response.data.forEach((log) => {
      logsMap[log.objective_id] = log;
    });
    set({ todayLogs: logsMap });
  },

  logObjective: async (objectiveId, status, value = null) => {
    const response = await api.post('/logs', { objective_id: objectiveId, status, value });
    const log = response.data;
    set((state) => ({
      todayLogs: { ...state.todayLogs, [objectiveId]: log },
    }));
    return log;
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

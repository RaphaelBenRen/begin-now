import { create } from 'zustand';
import api from '../lib/api';

const useDuelsStore = create((set) => ({
  duels: [],
  isLoading: false,

  fetchDuels: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/duels');
      set({ duels: response.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  proposeDuel: async (data) => {
    const response = await api.post('/duels', data);
    set((state) => ({ duels: [response.data, ...state.duels] }));
    return response.data;
  },

  acceptDuel: async (id) => {
    await api.patch(`/duels/${id}/accept`);
    set((state) => ({
      duels: state.duels.map((d) => d.id === id ? { ...d, status: 'accepted' } : d),
    }));
  },

  declineDuel: async (id) => {
    await api.patch(`/duels/${id}/decline`);
    set((state) => ({
      duels: state.duels.map((d) => d.id === id ? { ...d, status: 'declined' } : d),
    }));
  },

  fetchDuelProgress: async (id) => {
    const response = await api.get(`/duels/${id}/progress`);
    return response.data;
  },

  logDuel: async (id, status) => {
    const response = await api.post(`/duels/${id}/log`, { status });
    return response.data;
  },
}));

export default useDuelsStore;

import { create } from 'zustand';
import api from '../lib/api';

const useFriendsStore = create((set) => ({
  friends: [],
  requests: [],
  isLoading: false,

  fetchFriends: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/friends');
      set({ friends: response.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchRequests: async () => {
    try {
      const response = await api.get('/friends/requests');
      set({ requests: response.data });
    } catch (_) {}
  },

  sendRequest: async (username) => {
    const response = await api.post('/friends/request', { username });
    return response.data;
  },

  acceptRequest: async (id) => {
    await api.patch(`/friends/${id}/accept`);
    set((state) => ({
      requests: state.requests.filter((r) => r.id !== id),
    }));
    // Recharger les amis
    const response = await api.get('/friends');
    set({ friends: response.data });
  },

  declineRequest: async (id) => {
    await api.patch(`/friends/${id}/decline`);
    set((state) => ({
      requests: state.requests.filter((r) => r.id !== id),
    }));
  },

  getFriendObjectives: async (friendId) => {
    const response = await api.get(`/friends/${friendId}/objectives`);
    return response.data;
  },
}));

export default useFriendsStore;

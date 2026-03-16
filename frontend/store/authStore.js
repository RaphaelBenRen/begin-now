import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../lib/api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: true,

  // Charger le token au démarrage
  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (token) {
        // Vérifier le token côté backend
        const response = await api.get('/auth/me');
        set({ user: response.data.user, token, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      set({ user: null, token: null, isLoading: false });
    }
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { user, access_token, refresh_token } = response.data;

    await SecureStore.setItemAsync('access_token', access_token);
    await SecureStore.setItemAsync('refresh_token', refresh_token);

    set({ user, token: access_token });
    return user;
  },

  register: async (email, password, username) => {
    const response = await api.post('/auth/register', { email, password, username });
    const { user, access_token, refresh_token } = response.data;

    await SecureStore.setItemAsync('access_token', access_token);
    await SecureStore.setItemAsync('refresh_token', refresh_token);

    set({ user, token: access_token });
    return user;
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({ user: null, token: null });
  },

  setUser: (user) => set({ user }),
}));

export default useAuthStore;

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../lib/api';
import { setToken, clearToken } from '../lib/tokenManager';

const useAuthStore = create((set) => ({
  user: null,
  isLoading: true,

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (token) {
        setToken(token); // disponible immédiatement pour les requêtes
        const response = await api.get('/auth/me');
        set({ user: response.data.user, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      clearToken();
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      set({ user: null, isLoading: false });
    }
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { user, access_token, refresh_token } = response.data;

    setToken(access_token);
    await SecureStore.setItemAsync('access_token', access_token);
    await SecureStore.setItemAsync('refresh_token', refresh_token);

    set({ user });
    return user;
  },

  register: async (email, password, username) => {
    const response = await api.post('/auth/register', { email, password, username });
    const { user, access_token, refresh_token } = response.data;

    setToken(access_token);
    await SecureStore.setItemAsync('access_token', access_token);
    await SecureStore.setItemAsync('refresh_token', refresh_token);

    set({ user });
    return user;
  },

  logout: async () => {
    clearToken();
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({ user: null });
  },

  setUser: (user) => set({ user }),
}));

export default useAuthStore;

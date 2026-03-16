import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../lib/api';
import { setToken, clearToken } from '../lib/tokenManager';

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (token) {
        setToken(token);
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

  // ─── Actions profil ──────────────────────────────────────────

  fetchFullProfile: async () => {
    const response = await api.get('/profile');
    set({ profile: response.data });
    return response.data;
  },

  updateUsername: async (username) => {
    const response = await api.patch('/profile', { username });
    set((state) => ({ user: { ...state.user, username: response.data.username } }));
    return response.data;
  },

  uploadAvatar: async (base64, mimeType) => {
    const response = await api.post('/profile/avatar', { base64, mimeType });
    const { avatar_url } = response.data;
    set((state) => ({ user: { ...state.user, avatar_url } }));
    return avatar_url;
  },

  changePassword: async (current_password, new_password) => {
    await api.patch('/profile/password', { current_password, new_password });
  },

  deleteAccount: async (password) => {
    await api.delete('/profile', { data: { password } });
    clearToken();
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({ user: null });
  },
}));

export default useAuthStore;

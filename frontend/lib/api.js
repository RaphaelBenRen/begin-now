import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { getToken, setToken, clearToken } from './tokenManager';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Intercepteur : lit d'abord le token en mémoire,
// puis SecureStore en fallback (fiable dans Expo Go)
api.interceptors.request.use(async (config) => {
  let token = getToken();

  if (!token) {
    try {
      const stored = await SecureStore.getItemAsync('access_token');
      if (stored) {
        setToken(stored);
        token = stored;
      }
    } catch (_) {
      // SecureStore indisponible, on continue sans token
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Gestion globale 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      clearToken();
      try {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
      } catch (_) {}
    }
    return Promise.reject(error);
  }
);

export default api;

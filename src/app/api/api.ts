import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { getToken } from '../../store/slices/authSlice';

const createClient = (baseURL: string): AxiosInstance =>
  axios.create({ baseURL, withCredentials: true });

/** Sends the stored bearer token, and returns to the login page when the session is rejected. */
const withAuth = (client: AxiosInstance): AxiosInstance => {
  client.interceptors.request.use(config => {
    const token = getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  client.interceptors.response.use(
    response => response,
    error => {
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }

      return Promise.reject(error);
    },
  );

  return client;
};

export const experimentApi = withAuth(createClient('/experiments'));

export const api = withAuth(createClient('/api'));

export const authApi = createClient('/auth');

export const dataApi = withAuth(createClient('/api/data'));

import axios, { AxiosInstance } from 'axios';
import { CONFIG } from './config.js';
import { getValidAccessToken } from './auth.js';

let _client: AxiosInstance | null = null;

export function getClient(): AxiosInstance {
  if (_client) return _client;

  _client = axios.create({
    baseURL: CONFIG.API_BASE,
    headers: { 'Content-Type': 'application/json' },
  });

  // Inject fresh access token on every request
  _client.interceptors.request.use(async (config) => {
    const token = await getValidAccessToken();
    config.headers.Authorization = `Zoho-oauthtoken ${token}`;
    return config;
  });

  // Surface Zoho API errors clearly
  _client.interceptors.response.use(
    (res) => res,
    (err) => {
      const msg =
        err.response?.data?.data?.errorMessage ||
        err.response?.data?.message ||
        err.message ||
        'Unknown Zoho API error';
      throw new Error(`Zoho API error: ${msg}`);
    }
  );

  return _client;
}

export async function zohoGet<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T> {
  const res = await getClient().get(path, { params });
  return res.data as T;
}

export async function zohoPost<T = unknown>(path: string, data?: unknown): Promise<T> {
  const res = await getClient().post(path, data);
  return res.data as T;
}

export async function zohoPut<T = unknown>(path: string, data?: unknown): Promise<T> {
  const res = await getClient().put(path, data);
  return res.data as T;
}

export async function zohoDelete<T = unknown>(path: string): Promise<T> {
  const res = await getClient().delete(path);
  return res.data as T;
}

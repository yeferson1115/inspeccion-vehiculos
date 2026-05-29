import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const SESSION_KEY = 'auth_session';

const DEFAULT_API_URL = 'http://localhost:8000/api';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;
const LOGIN_PATH = process.env.EXPO_PUBLIC_LOGIN_PATH ?? '/login';

interface ApiLoginResponse {
  access_token?: string;
  data?: {
    access_token?: string;
    plainTextToken?: string;
    token?: string;
    user?: unknown;
  };
  plainTextToken?: string;
  token?: string;
  user?: unknown;
}

export interface AuthSession {
  token: string | null;
  user: unknown;
  raw: ApiLoginResponse;
}

const extractToken = (response: ApiLoginResponse) =>
  response.token ??
  response.access_token ??
  response.plainTextToken ??
  response.data?.token ??
  response.data?.access_token ??
  response.data?.plainTextToken ??
  null;

const extractUser = (response: ApiLoginResponse) => response.user ?? response.data?.user ?? null;

export const login = async (identifier: string, password: string) => {
  const normalizedIdentifier = identifier.trim();
  const { data } = await axios.post<ApiLoginResponse>(`${API_URL}${LOGIN_PATH}`, {
    email: normalizedIdentifier,
    usuario: normalizedIdentifier,
    user: normalizedIdentifier,
    username: normalizedIdentifier,
    password,
  });

  const session: AuthSession = {
    token: extractToken(data),
    user: extractUser(data),
    raw: data,
  };

  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));

  return session;
};

export const getSession = async () => {
  const rawSession = await AsyncStorage.getItem(SESSION_KEY);
  return rawSession ? (JSON.parse(rawSession) as AuthSession) : null;
};

export const logout = () => AsyncStorage.removeItem(SESSION_KEY);

const getMessageFromResponse = (responseData: unknown) => {
  if (!responseData || typeof responseData !== 'object') {
    return null;
  }

  const data = responseData as Record<string, unknown>;

  if (typeof data.message === 'string') {
    return data.message;
  }

  if (data.errors && typeof data.errors === 'object') {
    const [firstError] = Object.values(data.errors as Record<string, unknown>);
    if (Array.isArray(firstError) && typeof firstError[0] === 'string') {
      return firstError[0];
    }
  }

  return null;
};

export const getLoginErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return getMessageFromResponse(error.response?.data) ?? 'No fue posible iniciar sesión con el API.';
  }

  return 'No fue posible iniciar sesión. Intenta nuevamente.';
};

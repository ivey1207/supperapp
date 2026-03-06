import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

export const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // @ts-expect-error expo extra
  const extra = global.expo?.extra ?? {};
  if (extra.apiUrl) return extra.apiUrl;

  // Use production server IP
  return 'http://161.97.118.117:8080';
};

console.log('Using API URL:', Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL);

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('app_token');
      delete api.defaults.headers.common['Authorization'];
      router.replace('/login');
    }
    return Promise.reject(error);
  }
);

export function getFileUrl(filename?: string): string | null {
  if (!filename) return null;
  if (filename.startsWith('http')) return filename;

  // Strip backend prefix if it already exists (to handle mixed DB data)
  const cleanFilename = filename.startsWith('/api/v1/files/')
    ? filename.replace('/api/v1/files/', '')
    : filename;

  return `${getBaseUrl()}/api/v1/files/${cleanFilename}`;
}

export function setAuthToken(token: string | null) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete api.defaults.headers.common['Authorization'];
}

export async function requestOtp(phone: string, email: string) {
  const { data } = await api.post('/api/v1/app-auth/otp/request', { phone, email });
  return data as { message: string };
}

export async function verifyOtp(phone: string, otp: string) {
  const { data } = await api.post('/api/v1/app-auth/otp/verify', { phone, otp });
  return data as { accessToken: string; refreshToken: string; isNewUser: boolean };
}

export type User = {
  id: string;
  phone: string;
  email?: string;
  fullName: string;
  carModel?: string;
  carNumber?: string;
};

export async function forgotPassword(identifier: { email?: string; phone?: string }) {
  const { data } = await api.post('/api/v1/app-auth/password/forgot', identifier);
  return data as { message: string; devOtp?: string };
}

export async function resetPassword(payload: { email?: string; phone?: string; otp: string; newPassword: string }) {
  const { data } = await api.post('/api/v1/app-auth/password/reset', payload);
  return data as { message: string };
}

export async function updateProfile(token: string, profile: Partial<User & { password?: string }>) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const { data } = await api.put('/api/v1/app/user/profile', profile, headers ? { headers } : undefined);
  return data as User;
}

export async function getMe(token: string) {
  const { data } = await api.get('/api/v1/app/me', { headers: { Authorization: `Bearer ${token}` } });
  return data as User;
}

export type Branch = {
  id: string;
  orgId: string;
  name: string;
  address: string;
  phone: string;
  status: string;
  partnerType: string;
  description?: string;
  workingHours?: string;
  images?: string[];
  photoUrl?: string;
  rating?: number;
  reviewCount?: number;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  distance?: number;
};

export async function getBranches(token: string, status?: string, filter?: string, partnerType?: string, lat?: number, lon?: number) {
  const params: Record<string, string> = {};
  if (status && status !== 'all') params.status = status;
  if (filter && filter !== 'all') params.filter = filter;
  if (partnerType) params.partnerType = partnerType;
  if (lat !== undefined) params.lat = lat.toString();
  if (lon !== undefined) params.lon = lon.toString();

  const { data } = await api.get('/api/v1/app/branches', {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return Array.isArray(data) ? (data as Branch[]) : [];
}

export async function getOrders(token: string) {
  const { data } = await api.get<{ content: unknown[] }>('/api/v1/app/orders', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data?.content ?? [];
}

export async function getWallet(token: string) {
  const { data } = await api.get('/api/v1/app/wallet', { headers: { Authorization: `Bearer ${token}` } });
  return data as { walletId: string; balance: number; currency: string };
}

export interface PartnerOrg {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
}

export interface Service {
  id: string;
  orgId: string;
  branchId?: string;
  name: string;
  description: string;
  category: string;
  pricePerMinute: number;
  durationMinutes: number;
  bookable: boolean;
  workingHours?: string;
}

export type Promotion = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  discountValue: string;
  startDate: string;
  endDate: string;
};

export type Review = {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type UserStory = {
  id: string;
  userId: string;
  userName: string;
  imageUrl: string;
  createdAt: string;
};

export async function getBranchById(token: string, branchId: string) {
  const { data } = await api.get(`/api/v1/app/branches/${branchId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as Branch;
}

export async function getPromotions(token: string, branchId?: string) {
  const { data } = await api.get('/api/v1/app/promotions', {
    params: { branchId },
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as Promotion[];
}

export async function getServices(token: string, branchId?: string, macId?: string) {
  const { data } = await api.get('/api/v1/app/services', {
    params: { branchId, macId },
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as Service[];
}

export async function scanQr(token: string, code: string) {
  const { data } = await api.get('/api/v1/app/qr/scan', {
    params: { code },
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as { macId: string; branchId: string; kioskId: string; name: string };
}

export interface OnDemandOrder {
  id?: string;
  type: string; // MOBILE_WASH, EMERGENCY_SERVICE
  status?: string;
  userAddress: string;
  userLat: number;
  userLon: number;
  carDetails: string;
  description?: string;
  providerId?: string;
  providerLat?: number;
  providerLon?: number;
  createdAt?: string;
}

export async function createOnDemandOrder(token: string, order: OnDemandOrder) {
  const { data } = await api.post('/api/v1/app/on-demand', order, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as OnDemandOrder;
}

export async function getOnDemandOrders(token: string) {
  const { data } = await api.get('/api/v1/app/on-demand', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as OnDemandOrder[];
}

export async function getReviews(token: string, branchId: string) {
  const { data } = await api.get(`/api/v1/app/reviews/branch/${branchId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as Review[];
}

export async function createReview(token: string, review: { branchId: string; rating: number; comment: string }) {
  const { data } = await api.post('/api/v1/app/reviews', review, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function getUserStories(token: string) {
  const { data } = await api.get('/api/v1/app/user-stories', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as UserStory[];
}

export async function createUserStory(token: string, imageUrl: string) {
  const { data } = await api.post('/api/v1/app/user-stories', { imageUrl }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function uploadImage(token: string, uri: string) {
  const formData = new FormData();
  const filename = uri.split('/').pop();
  const match = /\.(\w+)$/.exec(filename || '');
  const type = match ? `image/${match[1]}` : `image`;

  formData.append('file', {
    uri,
    name: filename,
    type,
  } as any);

  const { data } = await api.post('/api/v1/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    },
  });
  return data as { url: string };
}

export default api;

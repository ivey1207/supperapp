import axios from 'axios';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  // @ts-expect-error expo extra
  const extra = global.expo?.extra ?? {};
  if (extra.apiUrl) return extra.apiUrl;

  // Use production server IP
  return 'http://161.97.118.117:8080';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

export function setAuthToken(token: string | null) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete api.defaults.headers.common['Authorization'];
}

export async function requestOtp(phone: string) {
  const { data } = await api.post('/api/v1/app-auth/otp/request', { phone });
  return data as { devOtp?: string };
}

export async function verifyOtp(phone: string, otp: string) {
  const { data } = await api.post('/api/v1/app-auth/otp/verify', { phone, otp });
  return data as { accessToken: string; refreshToken: string; isNewUser: boolean };
}

export type User = {
  id: string;
  phone: string;
  fullName: string;
  carModel?: string;
  carNumber?: string;
};

export async function updateProfile(token: string, profile: Partial<User>) {
  const { data } = await api.put('/api/v1/app/user/profile', profile, {
    headers: { Authorization: `Bearer ${token}` }
  });
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
  workingHours?: string;
  images?: string[];
  photoUrl?: string;
  rating?: number;
  reviewCount?: number;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
};

export async function getBranches(token: string, status?: string) {
  const { data } = await api.get('/api/v1/app/branches', {
    headers: { Authorization: `Bearer ${token}` },
    params: status ? { status } : {},
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

export type Promotion = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  discountValue: string;
  startDate: string;
  endDate: string;
};

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
  return data as any[];
}

export async function scanQr(token: string, code: string) {
  const { data } = await api.get('/api/v1/app/qr/scan', {
    params: { code },
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as { macId: string; branchId: string; kioskId: string; name: string };
}

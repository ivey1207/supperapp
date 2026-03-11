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
  timeout: 15000, // 15 seconds timeout
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('app_token');
      delete api.defaults.headers.common['Authorization'];
      router.replace('/welcome');
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

export function formatTimeAgo(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
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

export async function register(payload: { fullName: string; phone: string; email: string; password?: string }) {
  const { data } = await api.post('/api/v1/app-auth/register', payload);
  return data as { message: string };
}

export async function verifyRegistration(phone: string, otp: string) {
  const { data } = await api.post('/api/v1/app-auth/register/verify', { phone, otp });
  return data as { accessToken: string; refreshToken: string; user: User };
}

export async function loginWithPassword(identifier: string, password: string) {
  const { data } = await api.post('/api/v1/app-auth/login', { email: identifier, password });
  return data as { accessToken: string; refreshToken: string; user: User };
}

export type User = {
  id: string;
  phone: string;
  email?: string;
  fullName: string;
  carModel?: string;
  carNumber?: string;
  avatarUrl?: string;
  isSpecialist?: boolean;
  isOnline?: boolean;
  specialist?: boolean;
  online?: boolean;
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
  discountValue?: string;
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
  templateId?: string;
  orgId?: string;
  branchId?: string;
  title: string;
  description: string;
  imageUrl?: string;
  discountValue: string;
  startDate: string;
  endDate: string;
  config?: any;
};

export type Review = {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  likeCount: number;
  isLiked?: boolean;
};

export type UserStory = {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  imageUrl: string;
  createdAt: string;
  likeCount: number;
  isLiked?: boolean;
};

export async function getBranchById(token: string, branchId: string) {
  const { data } = await api.get(`/api/v1/app/branches/${branchId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as Branch;
}

export async function getPromotions(token: string, branchId?: string, serviceType?: string, orderAmount?: number) {
  const { data } = await api.get('/api/v1/app/promotions', {
    params: { branchId, serviceType, orderAmount },
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
  contractorId?: string;
  providerLat?: number;
  providerLon?: number;
  providerHeading?: number;
  createdAt?: string;
  acceptedAt?: string;
  completedAt?: string;
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

export async function getAvailableOrders(token: string) {
  const { data } = await api.get('/api/v1/app/on-demand/available', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as OnDemandOrder[];
}

export async function getActiveSpecialistOrder(token: string) {
  const { data } = await api.get('/api/v1/app/on-demand/contractor/active', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const orders = data as OnDemandOrder[];
  return orders.length > 0 ? orders[0] : null;
}

export async function acceptOrder(token: string, orderId: string) {
  const { data } = await api.post(`/api/v1/app/on-demand/${orderId}/accept`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as OnDemandOrder;
}

export async function updateOrderStatus(token: string, orderId: string, status: string) {
  const { data } = await api.post(`/api/v1/app/on-demand/${orderId}/status`, null, {
    params: { status },
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as OnDemandOrder;
}

export async function updateSpecialistStatus(token: string, online: boolean) {
  const { data } = await api.post('/api/v1/app/user/specialist/status', null, {
    params: { online },
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as User;
}

export async function updateSpecialistLocation(token: string, lat: number, lon: number, heading?: number) {
  const { data } = await api.post('/api/v1/app/user/specialist/location', null, {
    params: { lat, lon, heading },
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as User;
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

export async function likeReview(token: string, reviewId: string) {
  const { data } = await api.post(`/api/v1/app/reviews/${reviewId}/like`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function unlikeReview(token: string, reviewId: string) {
  const { data } = await api.post(`/api/v1/app/reviews/${reviewId}/unlike`, {}, {
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

export async function likeUserStory(token: string, storyId: string) {
  const { data } = await api.post(`/api/v1/app/user-stories/${storyId}/like`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function unlikeUserStory(token: string, storyId: string) {
  const { data } = await api.post(`/api/v1/app/user-stories/${storyId}/unlike`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function commentOnUserStory(token: string, storyId: string, content: string) {
  const { data } = await api.post(`/api/v1/app/user-stories/${storyId}/comments`, { content }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function getStoryComments(token: string, storyId: string) {
  const { data } = await api.get(`/api/v1/app/user-stories/${storyId}/comments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as any[];
}

export type WashSession = {
  id: string;
  kioskId: string;
  status: 'ACTIVE' | 'PAUSED' | 'FINISHED';
  paidAmount: number;
  startedAt: string;
  finishedAt?: string;
  finishReason?: string;
};

export async function getKioskInfo(token: string, macId: string) {
  const { data } = await api.get(`/api/v1/app/kiosk/${macId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as { id: string; name: string; orgId: string; branchId: string; services: Service[] };
}

export async function startWashSession(token: string, kioskId: string, amount: number) {
  const { data } = await api.post(`/api/v1/app/kiosk/${kioskId}/start-session`, { amount }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as WashSession;
}

export async function getActiveWashSession(token: string) {
  try {
    const { data } = await api.get('/api/v1/app/wash-sessions/active', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data as WashSession;
  } catch (e) {
    return null;
  }
}

export async function stopWashSession(token: string, sessionId: string) {
  const { data } = await api.post(`/api/v1/app/wash-sessions/${sessionId}/stop`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as WashSession;
}

export async function pauseWashSession(token: string, sessionId: string, pause: boolean) {
  const { data } = await api.post(`/api/v1/app/wash-sessions/${sessionId}/pause`, { pause }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as WashSession;
}

export async function getWashSessionHistory(token: string) {
  const { data } = await api.get('/api/v1/app/wash-sessions', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as WashSession[];
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

// Notifications
export async function getNotifications(token: string) {
  const { data } = await api.get('/api/v1/app/notifications', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data as any[];
}

export async function markNotificationRead(token: string, id: string) {
  const { data } = await api.post(`/api/v1/app/notifications/${id}/read`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}

export async function getUnreadNotificationsCount(token: string) {
  const { data } = await api.get('/api/v1/app/notifications/unread-count', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data as { count: number };
}

// Favorites
export async function getFavoriteBranches(token: string) {
  const { data } = await api.get('/api/v1/app/favorites/branches', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data as Branch[];
}

export async function toggleFavoriteBranch(token: string, branchId: string) {
  const { data } = await api.post(`/api/v1/app/favorites/branches/${branchId}/toggle`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data as { isFavorite: boolean };
}

export async function checkIsFavorite(token: string, branchId: string) {
  const { data } = await api.get(`/api/v1/app/favorites/branches/${branchId}/check`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data as { isFavorite: boolean };
}

export default api;

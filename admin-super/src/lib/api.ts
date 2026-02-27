import axios from 'axios';

const api = axios.create({
  baseURL: 'http://161.97.118.117:8080',
});

export const getFileUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// File upload
export async function uploadFile(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/api/v1/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return { url: getFileUrl(data.url) };
}

// Auth functions
export async function login(email: string, password: string) {
  const { data } = await api.post('/api/v1/admin/auth/login', { email, password });
  return data;
}

export function setToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
}

export async function getMe(token: string) {
  const { data } = await api.get('/api/v1/admin/auth/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}

export type Organization = {
  id: string;
  name: string;
  inn?: string;
  status: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  workingHours?: string;
  rating?: number;
  reviewCount?: number;
  logoUrl?: string;
  partnerType?: string;
};

export async function getOrganizations(): Promise<Organization[]> {
  const { data } = await api.get('/api/v1/admin/organizations');
  return data;
}

export type Account = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  orgId: string;
};

export async function getAccounts(): Promise<Account[]> {
  const { data } = await api.get('/api/v1/admin/accounts');
  return data;
}

export async function createAccount(email: string, password: string, fullName: string, role: string, orgId: string) {
  const { data } = await api.post('/api/v1/admin/accounts', { email, password, fullName, role, orgId });
  return data;
}

export async function updateAccount(id: string, fullName: string, role: string, password?: string) {
  const { data } = await api.put(`/api/v1/admin/accounts/${id}`, { fullName, role, password });
  return data;
}

export type Branch = {
  id: string;
  orgId: string;
  name: string;
  address: string;
  phone: string;
  status: string;
  partnerType?: string;
  boxCount?: number;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
};

export async function deleteAccount(id: string) {
  await api.delete(`/api/v1/admin/accounts/${id}`);
}

export async function getBranches(orgId?: string): Promise<Branch[]> {
  const params = orgId ? { orgId } : {};
  const { data } = await api.get('/api/v1/admin/branches', { params });
  return data;
}

export async function createBranch(orgId: string, name: string, address: string, phone: string, status: string, partnerType?: string, boxCount?: number) {
  const { data } = await api.post('/api/v1/admin/branches', { orgId, name, address, phone, status, partnerType, boxCount });
  return data;
}

export async function updateBranch(id: string, name: string, address: string, phone: string, status: string, partnerType?: string) {
  const { data } = await api.put(`/api/v1/admin/branches/${id}`, { name, address, phone, status, partnerType });
  return data;
}

export async function deleteBranch(id: string) {
  await api.delete(`/api/v1/admin/branches/${id}`);
}

export async function createOrganization(payload: Partial<Organization>) {
  const { data } = await api.post('/api/v1/admin/organizations', payload);
  return data;
}

export async function updateOrganization(id: string, payload: Partial<Organization>) {
  const { data } = await api.put(`/api/v1/admin/organizations/${id}`, payload);
  return data;
}

export async function deleteOrganization(id: string) {
  await api.delete(`/api/v1/admin/organizations/${id}`);
}

export async function attachKiosksToOrganization(orgId: string, kioskIds: string[]) {
  await api.post(`/api/v1/admin/organizations/${orgId}/attach-kiosks`, { kioskIds });
}

export type Service = {
  id: string;
  orgId: string;
  branchId?: string;
  name: string;
  description: string;
  category: string;
  pricePerMinute: number;
  durationMinutes: number;
  bookable: boolean;
  active: boolean;
  relayBits?: string;
  command?: string;
  motorFlag?: string;
  motorFrequency?: number;
  pump1Power?: number;
  pump2Power?: number;
  pump3Power?: number;
  pump4Power?: number;
  bookingIntervalMinutes?: number;
  workingHours?: string;
};

export async function getServices(orgId?: string, branchId?: string): Promise<Service[]> {
  const { data } = await api.get('/api/v1/admin/services', {
    params: { orgId, branchId }
  });
  return data;
}

export async function createService(payload: Partial<Service>): Promise<Service> {
  const { data } = await api.post('/api/v1/admin/services', payload);
  return data;
}

export async function updateService(id: string, payload: Partial<Service>): Promise<Service> {
  const { data } = await api.put(`/api/v1/admin/services/${id}`, payload);
  return data;
}

export async function deleteService(id: string): Promise<void> {
  await api.delete(`/api/v1/admin/services/${id}`);
}

export type Promotion = {
  id: string;
  orgId: string;
  branchId?: string;
  title: string;
  description: string;
  imageUrl?: string;
  discountValue: string;
  startDate: string;
  endDate: string;
  active: boolean;
};

export async function getPromotions(orgId?: string, branchId?: string): Promise<Promotion[]> {
  const { data } = await api.get('/api/v1/admin/promotions', {
    params: { orgId, branchId }
  });
  return data;
}

export async function createPromotion(payload: Partial<Promotion>): Promise<Promotion> {
  const { data } = await api.post('/api/v1/admin/promotions', payload);
  return data;
}

export async function updatePromotion(id: string, payload: Partial<Promotion>): Promise<Promotion> {
  const { data } = await api.put(`/api/v1/admin/promotions/${id}`, payload);
  return data;
}

export async function deletePromotion(id: string): Promise<void> {
  await api.delete(`/api/v1/admin/promotions/${id}`);
}

export async function getDevices(orgId?: string) {
  const { data } = await api.get('/api/v1/admin/devices', { params: orgId ? { orgId } : {} });
  return data;
}

export async function createDevice(payload: Record<string, unknown>) {
  const { data } = await api.post('/api/v1/admin/devices', payload);
  return data;
}

export async function updateDevice(id: string, payload: Record<string, unknown>) {
  const { data } = await api.put(`/api/v1/admin/devices/${id}`, payload);
  return data;
}

export async function deleteDevice(id: string) {
  await api.delete(`/api/v1/admin/devices/${id}`);
}
export type KioskServiceIotConfig = {
  relayBits?: string;
  motorFrequency?: number;
  motorFlag?: string;
  pump1Power?: number;
  pump2Power?: number;
  pump3Power?: number;
  pump4Power?: number;
};

export type HardwareKiosk = {
  id: string;
  name: string;
  kioskId: string;
  macId: string;
  orgId: string;
  branchId: string;
  status: string;
  lastHeartbeat?: string;
  ipAddress?: string;
  version?: string;
  iotOverrides?: Record<string, KioskServiceIotConfig>;
};

export async function getHardwareKiosks(params?: Record<string, unknown>): Promise<HardwareKiosk[]> {
  const { data } = await api.get('/api/v1/admin/hardware-kiosks', {
    params
  });
  return data;
}

export async function createHardwareKiosk(payload: Record<string, unknown>) {
  const { data } = await api.post('/api/v1/admin/hardware-kiosks', payload);
  return data;
}

export async function updateHardwareKiosk(id: string, payload: Record<string, unknown>) {
  const { data } = await api.put(`/api/v1/admin/hardware-kiosks/${id}`, payload);
  return data;
}


export async function deleteHardwareKiosk(id: string) {
  await api.delete(`/api/v1/admin/hardware-kiosks/${id}`);
}

export async function assignHardwareKiosk(id: string, payload: { orgId: string, branchId?: string }) {
  await api.post(`/api/v1/admin/hardware-kiosks/${id}/assign`, payload);
}

export async function unassignHardwareKiosk(id: string) {
  await api.post(`/api/v1/admin/hardware-kiosks/${id}/unassign`);
}

export async function topUpHardwareKioskBalance(id: string, amount: number) {
  const { data } = await api.post(`/api/v1/admin/hardware-kiosks/${id}/top-up`, { amount });
  return data;
}

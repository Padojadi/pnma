const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4010/api';

export type UserRole = 'ADMIN' | 'CALL_CENTER' | 'SUBSCRIBER' | 'PARTNER' | 'INSURER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  active?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  subscriberProfile?: {
    id: string;
    city?: string;
    vehiclePlate?: string;
    isEnterprise?: boolean;
    subscriptions?: Array<{
      status: string;
      offerPlan?: { name: string; level: string; medicalCeilingFcfa: number };
    }>;
  };
  partnerProfile?: {
    id: string;
    businessName: string;
    type: string;
    status: string;
    city: string;
  };
}

export interface OfferPlan {
  id: string;
  level: string;
  name: string;
  annualPriceFcfa: number;
  medicalCeilingFcfa: number;
  priorityIntervention: boolean;
  premiumAssistance: boolean;
  adminSupport: boolean;
  description?: string;
}

export interface Incident {
  id: string;
  reference: string;
  type: string;
  status: string;
  priority: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  estimatedEtaMin?: number;
  distanceKm?: number;
  createdAt: string;
  resolvedAt?: string;
  reporter?: { firstName: string; lastName: string; phone?: string };
  assignedPartner?: { businessName: string; user?: { phone?: string } };
  updates?: Array<{ status: string; message: string; createdAt: string }>;
}

export interface Partner {
  id: string;
  businessName: string;
  type: string;
  status: string;
  city: string;
  latitude: number;
  longitude: number;
  rating: number;
  specialties: string[];
  phone?: string;
  distanceKm?: number;
}

export interface DashboardData {
  kpis: {
    subscribers: number;
    partners: number;
    incidents: number;
    openIncidents: number;
    resolvedIncidents: number;
    resolutionRate: number;
    avgEtaMin: number;
    avgResolutionMin: number;
    medicalRequests: number;
    medicalVolumeFcfa: number;
    medicalApprovedFcfa: number;
    activeSubscriptions: number;
    insuranceContracts: number;
    trainings: number;
  };
  byType: Array<{ type: string; _count: number }>;
  byCity: Array<{ city: string | null; _count: number }>;
  byStatus: Array<{ status: string; _count: number }>;
  recentIncidents: Incident[];
  growthTargets: Array<{ year: number; subscribers: number; coverage: string[] }>;
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function setAuth(token: string, user: User) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Erreur serveur');
  }
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (data: Record<string, unknown>) =>
    request<{ user: User; accessToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  me: () => request<User>('/auth/me'),
  offers: () => request<OfferPlan[]>('/offers'),
  partners: (params?: string) => request<Partner[]>(`/partners${params ? `?${params}` : ''}`),
  nearestPartner: (lat: number, lng: number, type?: string) =>
    request<{ nearest: Partner | null; candidates: Partner[] }>(
      `/partners/dispatch/nearest?latitude=${lat}&longitude=${lng}${type ? `&type=${type}` : ''}`,
    ),
  incidents: (params?: string) => request<Incident[]>(`/incidents${params ? `?${params}` : ''}`),
  incident: (id: string) => request<Incident>(`/incidents/${id}`),
  createIncident: (data: Record<string, unknown>) =>
    request<{ incident: Incident }>('/incidents', { method: 'POST', body: JSON.stringify(data) }),
  updateIncidentStatus: (id: string, data: Record<string, unknown>) =>
    request<Incident>(`/incidents/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  autoDispatch: (id: string) => request<{ incident: Incident }>(`/incidents/${id}/auto-dispatch`, { method: 'POST' }),
  dashboard: () => request<DashboardData>('/analytics/dashboard'),
  medical: () => request<Array<Record<string, unknown>>>('/medical'),
  createMedical: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/medical', { method: 'POST', body: JSON.stringify(data) }),
  decideMedical: (id: string, approve: boolean) =>
    request<Record<string, unknown>>(`/medical/${id}/decide`, {
      method: 'PATCH',
      body: JSON.stringify({ approve }),
    }),
  insurancePartners: () => request<Array<{ id: string; name: string; code: string }>>('/insurance/partners'),
  insuranceContracts: () => request<Array<Record<string, unknown>>>('/insurance/contracts'),
  trainings: () => request<Array<Record<string, unknown>>>('/training'),
  enrollTraining: (id: string) =>
    request<Record<string, unknown>>(`/training/${id}/enroll`, { method: 'POST' }),
  aiOptimize: (id: string) => request<Record<string, unknown>>(`/ai/incidents/${id}/optimize`, { method: 'POST' }),
  aiNetwork: () => request<Record<string, unknown>>('/ai/network/insights', { method: 'POST' }),
  aiSuggestions: () => request<Array<Record<string, unknown>>>('/ai/suggestions'),
  updateLocation: (latitude: number, longitude: number) =>
    request('/users/me/location', { method: 'PATCH', body: JSON.stringify({ latitude, longitude }) }),
};

export function formatFcfa(n: number) {
  return `${n.toLocaleString('fr-FR')} FCFA`;
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    RECEIVED: 'Reçu',
    DISPATCHING: 'Dispatch',
    ASSIGNED: 'Assigné',
    EN_ROUTE: 'En route',
    ON_SITE: 'Sur place',
    RESOLVED: 'Résolu',
    CANCELLED: 'Annulé',
    AVAILABLE: 'Disponible',
    BUSY: 'Occupé',
    OFFLINE: 'Hors ligne',
    REQUESTED: 'Demandé',
    APPROVED: 'Approuvé',
    DISBURSED: 'Décaissé',
    REJECTED: 'Rejeté',
  };
  return map[status] || status;
}

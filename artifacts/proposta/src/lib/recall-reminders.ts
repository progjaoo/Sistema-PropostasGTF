import { useAuthStore } from '@/store/auth';

export type RecallReminderStatus = 'PENDING' | 'NOTIFIED' | 'SNOOZED' | 'DONE' | 'CANCELLED';

export type RecallReminder = {
  id: string;
  milestoneMonths: number;
  rejectedAt: string;
  dueAt: string;
  effectiveDueAt: string;
  snoozedUntil: string | null;
  status: RecallReminderStatus;
  statusLabel: string;
  lastNotifiedAt: string | null;
  handledAt: string | null;
  note: string | null;
  proposal: {
    id: string;
    status: string;
    statusLabel: string;
    propType: string;
    proposalTypeName: string | null;
    investValue: string | null;
    updatedAt: string;
  };
  advertiser: {
    id: string;
    name: string;
    status: 'LEAD' | 'CLIENT';
    statusLabel: string;
  } | null;
  station: {
    id: string;
    name: string;
    primaryColor: string;
  } | null;
  assignedTo: {
    id: string;
    name: string;
  } | null;
  handledBy: {
    id: string;
    name: string;
  } | null;
};

export type RecallReminderListResponse = {
  items: RecallReminder[];
  meta: {
    total: number;
    due: number;
  };
};

export type RecallReminderFilters = {
  search?: string;
  stationId?: string;
  assignedToId?: string;
  milestoneMonths?: string;
  status?: string;
  includeFuture?: boolean;
  limit?: number;
};

function authHeaders() {
  const token = useAuthStore.getState().accessToken;
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(authHeaders() ?? {}),
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? 'Nao foi possivel concluir a operacao.');
  }

  return response.json() as Promise<T>;
}

export function buildRecallReminderQuery(filters: RecallReminderFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.stationId && filters.stationId !== 'all') params.set('stationId', filters.stationId);
  if (filters.assignedToId && filters.assignedToId !== 'all') params.set('assignedToId', filters.assignedToId);
  if (filters.milestoneMonths && filters.milestoneMonths !== 'all') params.set('milestoneMonths', filters.milestoneMonths);
  if (filters.status && filters.status !== 'active') params.set('status', filters.status);
  if (filters.includeFuture) params.set('includeFuture', 'true');
  if (filters.limit) params.set('limit', String(filters.limit));
  return params.toString();
}

export function fetchRecallReminders(filters: RecallReminderFilters = {}) {
  const query = buildRecallReminderQuery(filters);
  return request<RecallReminderListResponse>(`/api/recall-reminders${query ? `?${query}` : ''}`);
}

export function fetchRecallReminderCount() {
  return request<{ due: number }>('/api/recall-reminders/count');
}

export function notifyRecallReminder(id: string) {
  return request<RecallReminder>(`/api/recall-reminders/${id}/notify`, { method: 'PATCH' });
}

export function snoozeRecallReminder(id: string, days: number) {
  return request<RecallReminder>(`/api/recall-reminders/${id}/snooze`, {
    method: 'PATCH',
    body: JSON.stringify({ days }),
  });
}

export function completeRecallReminder(id: string, note?: string) {
  return request<RecallReminder>(`/api/recall-reminders/${id}/done`, {
    method: 'PATCH',
    body: JSON.stringify({ note: note?.trim() || null }),
  });
}

export function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value));
}

export function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}


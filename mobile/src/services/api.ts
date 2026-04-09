import type {
	Issue,
	IssueFilters,
	CreateIssueRequest,
} from '@campusapp/shared';
import type {
	LostFoundItem,
	CreateLostFoundRequest,
} from '@campusapp/shared';
import Constants from 'expo-constants';

// Auto-detect the dev server IP so physical devices can reach the backend.
// Expo Go sets hostUri to "192.168.x.x:8081" — we extract the IP and use port 3000.
// Override with EXPO_PUBLIC_API_URL env var if needed.
function getApiBase(): string {
	if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
	const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.42:8081"
	if (hostUri) {
		const ip = hostUri.split(':')[0];
		return `http://${ip}:3000/api`;
	}
	return 'http://localhost:3000/api';
}

export const API_BASE = getApiBase();

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
	authToken = token;
}

async function request<T>(
	path: string,
	options: RequestInit = {}
): Promise<T> {
	const headers: Record<string, string> = {
	'Content-Type': 'application/json',
	...(options.headers as Record<string, string> ?? {}),
	};
	if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

	const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
	if (!res.ok) {
		const err = await res.json().catch(() => ({ message: res.statusText }));
		throw new Error(err.message ?? 'Request failed');
	}
	return res.json();
}

// AUTH
export const authAPI = {
	register: (email: string, password: string) =>
		request<{ message: string }>('/auth/register', {
			method: 'POST',
			body: JSON.stringify({ email, password }),
		}),

	login: (email: string, password: string) =>
		request<{ token: string; user: { id: number; email: string; role: string } }>(
		'/auth/login',
		{ method: 'POST', body: JSON.stringify({ email, password }) }
	),
};

// Issues (for Darin)
export const issuesApi = {
	getAll: (filters?: IssueFilters) => {
		const params = filters
			? '?' + new URLSearchParams(filters as Record<string, string>).toString()
			: '';
		return request<Issue[]>(`/issues${params}`);
	},

	create: (data: CreateIssueRequest) =>
		request<Issue>('/issues', { method: 'POST', body: JSON.stringify(data) }),

	markFixed: (id: number) =>
		request<Issue>(`/issues/${id}`, {
			method: 'PATCH',
			body: JSON.stringify({ status: 'fixed' }),
	}),
};

// Lost & Found (for Henry)
export const lostFoundApi = {
	getAll: () => request<LostFoundItem[]>('/lost-found'),

	create: (data: CreateLostFoundRequest) =>
		request<LostFoundItem>('/lost-found', {
			method: 'POST',
			body: JSON.stringify(data),
	}),

	resolve: (id: number) =>
		request<LostFoundItem>(`/lost-found/${id}`, {
			method: 'PATCH',
			body: JSON.stringify({ status: 'resolved' }),
	}),
};
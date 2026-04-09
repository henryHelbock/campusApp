import type {
	Issue,
	IssueFilters,
	CreateIssueRequest,
} from '@campusapp/shared';
import type {
	LostFoundItem,
	CreateLostFoundRequest,
} from '@campusapp/shared';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

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
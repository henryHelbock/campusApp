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

// Thrown when fetch itself rejects before getting a response (DNS failure,
// connection refused, timeout). Screens use this tag to decide whether to
// show the demo-data fallback vs a real error surface.
export class NetworkError extends Error {
	cause?: unknown;
	constructor(cause?: unknown) {
		super('Network request failed');
		this.name = 'NetworkError';
		this.cause = cause;
	}
}

const REQUEST_TIMEOUT_MS = 15000;

async function request<T>(
	path: string,
	options: RequestInit = {}
): Promise<T> {
	const headers: Record<string, string> = {
	'Content-Type': 'application/json',
	...(options.headers as Record<string, string> ?? {}),
	};
	if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	let res: Response;
	try {
		res = await fetch(`${API_BASE}${path}`, { ...options, headers, signal: controller.signal });
	} catch (err) {
		// fetch rejection (DNS, connection refused, timeout/abort) — tag as NetworkError
		// so the UI can show the demo-data fallback instead of a real error banner.
		throw new NetworkError(err);
	} finally {
		clearTimeout(timeoutId);
	}
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
		const entries = Object.entries(filters ?? {}).filter(
			(pair): pair is [string, string] =>
				typeof pair[1] === 'string' && pair[1] !== ''
		);
		const params = entries.length
			? '?' + new URLSearchParams(entries).toString()
			: '';
		return request<Issue[]>(`/issues${params}`);
	},

	create: (data: CreateIssueRequest) =>
		request<Issue>('/issues', { method: 'POST', body: JSON.stringify(data) }),

	markFixed: (id: number) =>
		request<Issue>(`/issues/${id}/resolve`, {
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
		request<LostFoundItem>(`/lost-found/${id}/resolve`, {
			method: 'PATCH',
			body: JSON.stringify({ status: 'resolved' }),
	}),
	claim: (id: number) =>
		request<{ message: string }>(`/lost-found/${id}/claim`, { method: 'PATCH' }),
};
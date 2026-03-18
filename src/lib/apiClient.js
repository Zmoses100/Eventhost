const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const AUTH_STORAGE_KEY = 'eventhost.auth.session';

const getAccessToken = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session?.access_token || null;
  } catch {
    return null;
  }
};

export const apiRequest = async (path, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const accessToken = getAccessToken();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
    const body = await response.json().catch(() => ({ data: null, error: { message: 'Invalid JSON response.' } }));
    if (!response.ok) {
      return { data: null, error: body.error || { message: 'Request failed.' }, count: null };
    }
    return { data: body.data ?? null, error: body.error ?? null, count: body.count ?? null };
  } catch (error) {
    return { data: null, error: { message: error.message || 'Network request failed.' }, count: null };
  }
};

export const runQuery = (payload) => apiRequest('/api/query', {
  method: 'POST',
  body: JSON.stringify(payload),
});

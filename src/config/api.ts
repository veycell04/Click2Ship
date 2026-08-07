export const API_BASE_URL =
  import.meta.env.VITE_CLICK2SHIP_API_BASE_URL?.trim() || 'http://127.0.0.1:3001';

export function apiUrl(path: string, baseUrl = API_BASE_URL): string {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, '');
  return `${normalizedBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export type WatchlistItem = {
  symbol: string;
  price: number | null;
};

type ApiResponse = {
  error?: string;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8787';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, init);
  const data = (await response.json()) as T & ApiResponse;

  if (!response.ok) throw new Error(data.error ?? 'Unable to complete the request.');

  return data;
}

export async function getWatchlist(): Promise<WatchlistItem[]> {
  const data = await request<{ items?: WatchlistItem[] }>('/api/watchlist');
  return data.items ?? [];
}

export function addWatchlistTicker(symbol: string) {
  return request<{ added: boolean; symbol: string }>('/api/watchlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ symbol }),
  });
}

export function removeWatchlistTicker(symbol: string) {
  return request<{ removed: boolean }>(`/api/watchlist/${encodeURIComponent(symbol)}`, {
    method: 'DELETE',
  });
}

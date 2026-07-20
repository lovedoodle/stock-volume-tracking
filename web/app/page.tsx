'use client';

import { FormEvent, useState } from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import {
  addWatchlistTicker,
  getWatchlist,
  removeWatchlistTicker,
  type WatchlistItem,
} from '../lib/api';

type Notice = { message: string; tone: 'error' | 'success' };

function formatPrice(price: number | null) {
  return price === null ? 'Price unavailable' : `$${price.toFixed(2)}`;
}

export default function Home() {
  const [symbol, setSymbol] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const {
    data: items = [],
    error,
    isLoading,
    mutate: mutateWatchlist,
  } = useSWR('watchlist', getWatchlist);
  const { trigger: addTicker, isMutating: isAdding } = useSWRMutation(
    'watchlist/add',
    (_, { arg }: { arg: string }) => addWatchlistTicker(arg),
  );
  const { trigger: removeTicker, isMutating: isRemoving } = useSWRMutation(
    'watchlist/remove',
    (_, { arg }: { arg: string }) => removeWatchlistTicker(arg),
  );
  const activeNotice =
    notice ?? (error ? { message: error.message, tone: 'error' as const } : null);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ticker = symbol.trim();
    if (!ticker) return;

    setNotice(null);
    try {
      const result = await addTicker(ticker);
      setSymbol('');
      setNotice({
        message: result.added ? `${result.symbol} added.` : `${result.symbol} is already tracked.`,
        tone: 'success',
      });
      await mutateWatchlist(
        (currentItems: WatchlistItem[] = []) =>
          result.added ? [...currentItems, { symbol: result.symbol, price: null }] : currentItems,
        { revalidate: true },
      );
    } catch (caughtError) {
      setNotice({
        message: caughtError instanceof Error ? caughtError.message : 'Unable to add ticker.',
        tone: 'error',
      });
    }
  }

  async function handleRemove(ticker: string) {
    setNotice(null);
    try {
      await removeTicker(ticker);
      await mutateWatchlist((currentItems: WatchlistItem[] = []) =>
        currentItems.filter((item) => item.symbol !== ticker),
      );
    } catch (caughtError) {
      setNotice({
        message: caughtError instanceof Error ? caughtError.message : 'Unable to remove ticker.',
        tone: 'error',
      });
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-xl">
        <header className="border-l-4 border-sky-500 pl-4">
          <p className="text-xs font-semibold tracking-widest text-sky-700 uppercase">
            Volume Watch
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Stock Volume Alert
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Get an email when a ticker reaches 1.5× its five-day average volume.
          </p>
        </header>

        <form
          onSubmit={handleAdd}
          className="mt-8 flex gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200"
        >
          <label className="sr-only" htmlFor="ticker">
            Ticker symbol
          </label>
          <input
            id="ticker"
            value={symbol}
            onChange={(event) => setSymbol(event.target.value.toUpperCase())}
            placeholder="AAPL"
            maxLength={15}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          <button
            type="submit"
            disabled={isAdding || !symbol.trim()}
            className="rounded-lg bg-sky-600 px-4 py-2 font-medium text-white transition hover:bg-sky-700 disabled:opacity-50"
          >
            {isAdding ? 'Adding…' : 'Add'}
          </button>
        </form>

        <div className="mt-3 min-h-5 text-sm" aria-live="polite">
          {activeNotice && (
            <p className={activeNotice.tone === 'success' ? 'text-emerald-700' : 'text-red-700'}>
              {activeNotice.message}
            </p>
          )}
        </div>

        <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
            <h2 className="font-semibold">Watchlist</h2>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-sm">
              {items.length} tickers
            </span>
          </div>

          {isLoading ? (
            <p className="px-4 py-6 text-sm text-slate-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No tickers yet.</p>
          ) : (
            <ul>
              {items.map((item, index) => (
                <li
                  key={item.symbol}
                  className={`flex items-center justify-between gap-4 px-4 py-3 ${
                    index > 0 ? 'border-t border-slate-200' : ''
                  }`}
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {item.symbol}{' '}
                      <span className="font-normal text-slate-500">{formatPrice(item.price)}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRemove(item.symbol)}
                    disabled={isRemoving}
                    className="rounded px-2 py-1 text-sm text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

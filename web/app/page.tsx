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

type Notice = {
  message: string;
  tone: 'error' | 'success';
};

function formatPrice(price: number | null) {
  return price === null ? '—' : `$${price.toFixed(2)}`;
}

export default function Home() {
  const [symbol, setSymbol] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const {
    data: items = [],
    error: watchlistError,
    isLoading,
    isValidating,
    mutate: refreshWatchlist,
  } = useSWR('watchlist', getWatchlist);
  const { trigger: addTickerRequest, isMutating: isAdding } = useSWRMutation(
    'watchlist/add',
    (_, { arg }: { arg: string }) => addWatchlistTicker(arg),
  );
  const { trigger: removeTickerRequest, isMutating: isRemoving } = useSWRMutation(
    'watchlist/remove',
    (_, { arg }: { arg: string }) => removeWatchlistTicker(arg),
  );
  const activeNotice =
    notice ?? (watchlistError ? { message: watchlistError.message, tone: 'error' as const } : null);

  const addTicker = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSymbol = symbol.trim();

    if (!nextSymbol) return;

    setNotice(null);

    try {
      const data = await addTickerRequest(nextSymbol);

      setNotice({
        message: data.added
          ? `${data.symbol} added to your watchlist.`
          : `${data.symbol} is already tracked.`,
        tone: 'success',
      });
      setSymbol('');
      void refreshWatchlist(
        (currentItems: WatchlistItem[] = []) =>
          data.added ? [...currentItems, { symbol: data.symbol, price: null }] : currentItems,
        { revalidate: true },
      );
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : 'Unable to add ticker.',
        tone: 'error',
      });
    }
  };

  const removeTicker = async (ticker: string) => {
    setNotice(null);

    try {
      await removeTickerRequest(ticker);

      setNotice({ message: `${ticker} removed from your watchlist.`, tone: 'success' });
      await refreshWatchlist();
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : 'Unable to remove ticker.',
        tone: 'error',
      });
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.18),_transparent_42%)]" />
      <div className="relative mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-400 font-black text-slate-950 shadow-lg shadow-emerald-500/20">
              V
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-white">Volume Watch</p>
              <p className="text-xs text-slate-400">Personal market monitor</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-300" />
            Daily scan enabled
          </span>
        </header>

        <section className="grid gap-8 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="mb-4 text-xs font-bold tracking-[0.22em] text-emerald-300 uppercase">
              U.S. stock volume alerts
            </p>
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Know when volume moves.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              We scan your watchlist after the market closes and email you when a ticker reaches at
              least 1.5× its five-day average volume.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="text-xs font-medium text-slate-400">Tickers tracked</p>
              <p className="mt-2 text-3xl font-semibold text-white">{items.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="text-xs font-medium text-slate-400">Alert threshold</p>
              <p className="mt-2 text-3xl font-semibold text-white">1.5×</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-emerald-400/20 bg-slate-900/80 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-7">
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Add to watchlist</h2>
              <p className="text-sm text-slate-400">
                Use a U.S. ticker symbol, such as AAPL or NVDA.
              </p>
            </div>
            <p className="text-xs font-medium text-emerald-300">Checks run after 4:15 PM ET</p>
          </div>
          <form onSubmit={addTicker} className="flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="ticker">
              Ticker symbol
            </label>
            <input
              id="ticker"
              value={symbol}
              onChange={(event) => setSymbol(event.target.value.toUpperCase())}
              placeholder="Enter ticker symbol"
              maxLength={15}
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3.5 font-medium text-white transition outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
            />
            <button
              type="submit"
              disabled={isAdding || !symbol.trim()}
              className="rounded-xl bg-emerald-400 px-5 py-3.5 font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAdding ? 'Adding…' : 'Add ticker'}
            </button>
          </form>
          <div className="mt-4 min-h-10" aria-live="polite">
            {activeNotice && (
              <p
                className={`rounded-lg px-3 py-2 text-sm ${
                  activeNotice.tone === 'success'
                    ? 'bg-emerald-400/10 text-emerald-200'
                    : 'bg-rose-400/10 text-rose-200'
                }`}
                role="status"
              >
                {activeNotice.message}
              </p>
            )}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl shadow-black/10">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5 sm:px-7">
            <div>
              <h2 className="font-semibold text-white">Your watchlist</h2>
              <p className="mt-1 text-sm text-slate-400">
                Latest available trading price for each symbol.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshWatchlist()}
              disabled={isValidating}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
            >
              {isValidating ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {isLoading ? (
            <div className="px-5 py-14 text-center text-sm text-slate-400 sm:px-7">
              Loading watchlist…
            </div>
          ) : items.length === 0 ? (
            <div className="px-5 py-14 text-center sm:px-7">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/5 text-xl text-slate-300">
                +
              </div>
              <h3 className="mt-4 font-medium text-white">Your watchlist is empty</h3>
              <p className="mt-1 text-sm text-slate-400">
                Add your first ticker above to start monitoring volume.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {items.map((item) => (
                <article
                  key={item.symbol}
                  className="flex items-center gap-4 px-5 py-4 transition hover:bg-white/[0.03] sm:px-7"
                >
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-800 font-bold text-emerald-300">
                    {item.symbol.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold tracking-wide text-white">{item.symbol}</h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {item.price === null
                        ? 'Price currently unavailable'
                        : 'Latest available price'}
                    </p>
                  </div>
                  <p className="hidden text-right text-lg font-semibold text-white tabular-nums sm:block">
                    {formatPrice(item.price)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void removeTicker(item.symbol)}
                    disabled={isRemoving}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-rose-400/70 hover:bg-rose-400/10 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

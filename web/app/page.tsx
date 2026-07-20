"use client";

import { FormEvent, useEffect, useState } from "react";

type WatchlistItem = { symbol: string; price: number | null };
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8787";

export default function Home() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [symbol, setSymbol] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); const response = await fetch(`${apiBase}/api/watchlist`); const data = await response.json(); setItems(data.items ?? []); setLoading(false); };
  useEffect(() => { void load(); }, []);
  const add = async (event: FormEvent) => { event.preventDefault(); const response = await fetch(`${apiBase}/api/watchlist`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ symbol }) }); const data = await response.json(); setMessage(response.ok ? (data.added ? `${data.symbol} added.` : `${data.symbol} is already tracked.`) : data.error); if (response.ok) { setSymbol(""); await load(); } };
  const remove = async (ticker: string) => { await fetch(`${apiBase}/api/watchlist/${ticker}`, { method: "DELETE" }); setMessage(`${ticker} removed.`); await load(); };
  return <main className="mx-auto min-h-screen max-w-3xl px-6 py-16"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">Personal market agent</p><h1 className="mt-3 text-4xl font-bold tracking-tight">Stock Volume Alert</h1><p className="mt-3 max-w-xl text-slate-400">Receive an email after market close when daily volume reaches 1.5× the prior five-day average.</p><section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl"><form onSubmit={add} className="flex flex-col gap-3 sm:flex-row"><input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} placeholder="Ticker, e.g. AAPL" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none ring-emerald-400 focus:ring-2"/><button className="rounded-lg bg-emerald-400 px-5 py-3 font-semibold text-emerald-950 hover:bg-emerald-300">Add ticker</button></form>{message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}</section><section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Watchlist</h2><button onClick={() => void load()} className="text-sm text-slate-400 hover:text-white">Refresh</button></div><div className="mt-4 divide-y divide-slate-800">{loading ? <p className="py-4 text-slate-400">Loading…</p> : items.length === 0 ? <p className="py-4 text-slate-400">No tickers yet.</p> : items.map((item) => <div key={item.symbol} className="flex items-center justify-between py-4"><div><p className="font-semibold">{item.symbol}</p><p className="text-sm text-slate-400">{item.price === null ? "Price unavailable" : `$${item.price.toFixed(2)}`}</p></div><button onClick={() => void remove(item.symbol)} className="rounded-md border border-slate-700 px-3 py-2 text-sm hover:border-rose-400 hover:text-rose-300">Remove</button></div>)}</div></section></main>;
}

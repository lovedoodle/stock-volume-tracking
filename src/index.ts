interface Env {
  DB: D1Database;
  TWELVE_DATA_BASE_URL: string;
  TWELVE_DATA_API_KEY: string;
  BREVO_API_KEY: string;
  FROM_EMAIL: string;
  ALERT_EMAIL: string;
  FROM_NAME?: string;
}

interface VolumeComparison {
  symbol: string;
  latest: number;
  average: number;
  ratio: number;
}

interface WatchlistItem {
  symbol: string;
  price: number | null;
}

const PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Stock Volume Alert</title><style>
:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#e5e7eb;background:#111827}body{max-width:760px;margin:0 auto;padding:48px 20px}h1{margin-bottom:6px}p{color:#9ca3af}.card{background:#1f2937;border:1px solid #374151;border-radius:12px;padding:20px;margin-top:24px}.row{display:flex;gap:10px}.row input{flex:1;padding:11px;border-radius:8px;border:1px solid #4b5563;background:#111827;color:#fff;font-size:16px}button{padding:10px 14px;border:0;border-radius:8px;background:#22c55e;color:#052e16;font-weight:700;cursor:pointer}button.remove{background:#374151;color:#e5e7eb}li{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #374151;font-weight:600}li:last-child{border:0}.hint,#message{font-size:14px}.error{color:#fca5a5}.success{color:#86efac}</style></head>
<body><h1>Stock Volume Alert</h1><p>Add U.S. tickers to receive an email when daily volume reaches 1.5&times; the prior five-day average.</p>
<section class="card"><div class="row"><input id="symbol" placeholder="Ticker, e.g. AAPL" maxlength="15"><button id="add">Add ticker</button></div><p id="message" role="status"></p><p class="hint">The check runs at 4:15 PM Eastern on trading days. No email is sent when nothing qualifies.</p></section>
<section class="card"><h2>Watchlist</h2><ul id="list"></ul></section>
<script>
const list=document.querySelector('#list'),input=document.querySelector('#symbol'),message=document.querySelector('#message');
function tell(text,kind=''){message.textContent=text;message.className=kind}
async function load(){const r=await fetch('/api/watchlist');const {items=[]}=await r.json();list.innerHTML='';if(!items.length){list.innerHTML='<li><span>No tickers yet.</span></li>';return}for(const item of items){const {symbol,price}=item,li=document.createElement('li'),label=document.createElement('span'),button=document.createElement('button');label.textContent=price===null?symbol+' — Price unavailable':symbol+' — $'+Number(price).toFixed(2);button.textContent='Remove';button.className='remove';button.onclick=async()=>{await fetch('/api/watchlist/'+encodeURIComponent(symbol),{method:'DELETE'});tell(symbol+' removed.','success');load()};li.append(label,button);list.append(li)}}
async function add(){const symbol=input.value.trim().toUpperCase();if(!symbol)return;const r=await fetch('/api/watchlist',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({symbol})});const data=await r.json();if(!r.ok){tell(data.error||'Unable to add ticker.','error');return}input.value='';tell(data.added?symbol+' added.':symbol+' is already on the watchlist.','success');load()}
document.querySelector('#add').onclick=add;input.addEventListener('keydown',e=>{if(e.key==='Enter')add()});load();
</script></body></html>`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (request.method === 'GET' && url.pathname === '/') return html(PAGE);
    if (url.pathname === '/api/watchlist') {
      if (request.method === 'GET') {
        const symbols = (await env.DB.prepare('SELECT symbol FROM watchlist ORDER BY symbol').all<{ symbol: string }>()).results.map((row) => row.symbol);
        const items = await Promise.all(symbols.map(async (symbol): Promise<WatchlistItem> => ({ symbol, price: await latestPrice(symbol, env) })));
        return json({ items });
      }
      if (request.method === 'POST') return addTicker(request, env);
    }
    if (request.method === 'DELETE' && url.pathname.startsWith('/api/watchlist/')) return removeTicker(decodeURIComponent(url.pathname.slice('/api/watchlist/'.length)), env);
    return json({ error: 'Not found' }, 404);
  },
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    if (!isNewYork415(event.scheduledTime)) return;
    ctx.waitUntil(sendDailySummary(env));
  }
} satisfies ExportedHandler<Env>;

async function addTicker(request: Request, env: Env): Promise<Response> {
  const { symbol = '' } = await request.json().catch(() => ({})) as { symbol?: string };
  const normalized = symbol.trim().toUpperCase();
  if (!/^[A-Z][A-Z.\-]{0,14}$/.test(normalized)) return json({ error: 'Enter a valid U.S. ticker symbol.' }, 400);
  const result = await env.DB.prepare('INSERT OR IGNORE INTO watchlist(symbol) VALUES(?)').bind(normalized).run();
  return json({ symbol: normalized, added: result.meta.changes === 1 });
}

async function removeTicker(symbol: string, env: Env): Promise<Response> {
  await env.DB.prepare('DELETE FROM watchlist WHERE symbol = ?').bind(symbol.toUpperCase()).run();
  return json({ removed: true });
}

async function sendDailySummary(env: Env): Promise<void> {
  const now = new Date();
  const runDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(now);
  const lock = await env.DB.prepare("INSERT OR IGNORE INTO daily_runs(run_date, status) VALUES(?, 'running')").bind(runDate).run();
  if (lock.meta.changes !== 1) return;
  const symbols = (await env.DB.prepare('SELECT symbol FROM watchlist ORDER BY symbol').all<{ symbol: string }>()).results.map((row) => row.symbol);
  const qualifying: VolumeComparison[] = [];
  for (const symbol of symbols) {
    const comparison = await volumeComparison(symbol, env);
    if (comparison && comparison.ratio >= 1.5) qualifying.push(comparison);
  }
  if (!qualifying.length) { await updateRun(env, runDate, 'no_alert'); return; }
  await sendEmail(qualifying, runDate, env);
  await updateRun(env, runDate, 'sent');
}

async function volumeComparison(symbol: string, env: Env): Promise<VolumeComparison | null> {
  const endpoint = new URL('/time_series', env.TWELVE_DATA_BASE_URL);
  endpoint.search = new URLSearchParams({ symbol, interval: '1day', outputsize: '6', apikey: env.TWELVE_DATA_API_KEY }).toString();
  const response = await fetch(endpoint);
  const data = await response.json() as { values?: Array<{ volume: string }> };
  if (!response.ok || !Array.isArray(data.values) || data.values.length < 6) return null;
  const days = data.values.slice(0, 6).reverse();
  const latestDay = days[days.length - 1];
  if (!latestDay) return null;
  const latest = Number(latestDay.volume);
  const prior = days.slice(0, -1).map((day) => Number(day.volume));
  if (!Number.isFinite(latest) || prior.some((value) => !Number.isFinite(value))) return null;
  const average = prior.reduce((sum, value) => sum + value, 0) / prior.length;
  return { symbol, latest, average, ratio: latest / average };
}

async function latestPrice(symbol: string, env: Env): Promise<number | null> {
  if (!env.TWELVE_DATA_API_KEY) return null;
  const endpoint = new URL('/price', env.TWELVE_DATA_BASE_URL);
  endpoint.search = new URLSearchParams({ symbol, apikey: env.TWELVE_DATA_API_KEY }).toString();
  const response = await fetch(endpoint);
  const data = await response.json() as { price?: string };
  const price = Number(data.price);
  return response.ok && Number.isFinite(price) ? price : null;
}

async function sendEmail(items: VolumeComparison[], runDate: string, env: Env): Promise<void> {
  const rows = items.sort((a, b) => b.ratio - a.ratio).map((item) => `<tr><td>${item.symbol}</td><td>${format(item.latest)}</td><td>${format(item.average)}</td><td>${item.ratio.toFixed(2)}x</td></tr>`).join('');
  const htmlBody = `<h2>Unusual stock volume — ${runDate}</h2><p>Daily volume is at least 1.5x the prior five-trading-day average.</p><table><thead><tr><th>Ticker</th><th>Today</th><th>5-day avg</th><th>Ratio</th></tr></thead><tbody>${rows}</tbody></table>`;
  const response = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'content-type': 'application/json', 'api-key': env.BREVO_API_KEY }, body: JSON.stringify({ sender: { name: env.FROM_NAME || 'Stock Volume Alert', email: env.FROM_EMAIL }, to: [{ email: env.ALERT_EMAIL }], subject: `Stock volume alert: ${items.map((item) => item.symbol).join(', ')}`, htmlContent: htmlBody }) });
  if (!response.ok) throw new Error(`Brevo email failed: ${await response.text()}`);
}

function updateRun(env: Env, runDate: string, status: string) { return env.DB.prepare('UPDATE daily_runs SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE run_date = ?').bind(status, runDate).run(); }
function isNewYork415(timestamp: number) { const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts(new Date(timestamp)); const value = Object.fromEntries(parts.map((part) => [part.type, part.value])); return !['Sat', 'Sun'].includes(value.weekday) && value.hour === '16' && value.minute === '15'; }
function format(value: number) { return new Intl.NumberFormat('en-US').format(Math.round(value)); }
const corsHeaders = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS', 'access-control-allow-headers': 'content-type' };
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...corsHeaders } }); }
function html(body: string) { return new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } }); }

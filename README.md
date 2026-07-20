# Stock Volume Alert

A personal U.S. stock watchlist. The Next.js frontend lets you add or remove tickers and view their latest prices. The Cloudflare Worker stores the watchlist and emails a Brevo summary when completed daily volume is at least 1.5x the prior five-trading-day average.

## Architecture

- `web/` — Next.js App Router frontend using TypeScript and Tailwind CSS.
- `src/` — Cloudflare Worker API and 4:15 PM Eastern scheduled volume check.
- `schema.sql` — Cloudflare D1 watchlist and daily-run tables.

## Run locally

Start the Worker API from the repository root:

```sh
cd work/app
npm install
npx wrangler d1 execute stock-volume-tracker --local --file=schema.sql
npm run dev
```

In a second terminal, start the frontend:

```sh
cd work/web
npm install
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8787 npm run dev
```

Open http://localhost:3000. The Worker API is available at http://127.0.0.1:8787.

## Deploy

1. Create a Cloudflare account, then run `npm install` and `npx wrangler login` from `work/app`.
2. Create the D1 database: `npx wrangler d1 create stock-volume-tracker`.
3. Copy its database ID into `wrangler.jsonc`.
4. Apply the schema: `npx wrangler d1 execute stock-volume-tracker --remote --file=schema.sql`.
5. Create a Twelve Data API key and a Brevo account with a verified sender address.
6. Set secrets:

   ```sh
   npx wrangler secret put TWELVE_DATA_API_KEY
   npx wrangler secret put BREVO_API_KEY
   npx wrangler secret put FROM_EMAIL
   npx wrangler secret put ALERT_EMAIL
   ```

7. Deploy the API Worker: `npm run deploy`.

The two UTC cron schedules handle daylight-saving time; the Worker proceeds only at 4:15 PM in `America/New_York`.

Set the same secrets with `npx wrangler secret put <NAME> --local` before testing scheduled delivery. Configure the frontend's `NEXT_PUBLIC_API_BASE_URL` to the deployed Worker URL for production.

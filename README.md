# Stock Volume Alert Agent

A Cloudflare Worker that hosts a public personal watchlist and sends a Brevo email summary when a U.S. stock's completed daily volume is at least 1.5x its prior five-trading-day average.

## Deploy

1. Create a Cloudflare account, then run `npm install` and `npx wrangler login`.
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

7. Deploy: `npm run deploy`.

The two UTC cron schedules handle daylight-saving time; the Worker proceeds only at 4:15 PM in `America/New_York`.

## Local development

Use a local D1 database:

```sh
npm install
npx wrangler d1 execute stock-volume-tracker --local --file=schema.sql
npm run dev
```

Set the same secrets with `npx wrangler secret put <NAME> --local` before testing scheduled delivery.

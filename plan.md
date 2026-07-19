# Stock Volume Alert Agent

## Goal

Deploy a simple personal web app that watches U.S. stocks and emails a daily alert when unusual trading volume occurs.

## MVP

- One user and one configured email recipient; no sign-in.
- Add and remove U.S. stock tickers from a live web watchlist.
- Run every trading day at 4:15 PM Eastern (15 minutes after market close).
- For each ticker, compare its completed daily volume with the average of the prior five completed trading days.
- Qualify when today's volume is at least **1.5×** the five-day average.
- Send at most one combined email per day, only when one or more tickers qualify.
- Each email entry includes the ticker, today's volume, five-day average, and volume ratio.
- Keep the watchlist persistent in the cloud. Alert history and failure notifications are out of scope for now.

## Stack

- **App, API, scheduler, database:** Cloudflare Workers + D1 free tier
- **Market data:** Twelve Data free tier
- **Email:** Brevo free tier

## Constraints

- The demo is cloud deployed and publicly accessible by URL.
- The data provider's free-tier limits define practical watchlist capacity.
- The alert calculation is deterministic; an LLM is not required for the MVP.

## Next

Build the web UI, volume-check job, email summary, and cloud deployment.

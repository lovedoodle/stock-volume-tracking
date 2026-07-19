# Stock Volume Tracking — Requirements Plan

## 1. Goal

Build a local-only web application that lets a user track trading-volume activity for a small, personal watchlist of publicly traded stocks. The first version should make it easy to see whether today's volume is unusually high or low compared with recent trading activity.

## 2. MVP user

- One local user.
- No sign-in, accounts, sharing, deployment, or multi-user features.

## 3. MVP requirements

### Watchlist management

- The user can add a stock ticker to a watchlist.
- The user can remove a ticker from the watchlist.
- The application prevents duplicate tickers and shows a clear message for an invalid or unavailable ticker.
- The watchlist persists locally between application restarts.

### Volume dashboard

- The dashboard displays one row or card per watched ticker.
- Each item shows at least:
  - Ticker symbol
  - Company name, when available from the data source
  - Latest available trading date
  - Latest daily trading volume
  - A baseline average daily volume using the previous 30 trading days
  - Volume ratio: latest volume divided by the 30-day average
  - A simple status label: `Below average`, `Near average`, or `Above average`
- The user can sort the watchlist by ticker, latest volume, or volume ratio.
- The user can refresh all watched tickers on demand and sees when the data was last refreshed.

### Stock detail view

- Selecting a ticker opens a detail view.
- The detail view shows the most recent 30 trading days of daily volume.
- The detail view includes a simple volume chart and a table of the same daily data.
- The user can return to the dashboard without losing the current watchlist.

### Data and error handling

- Data is retrieved from one market-data provider, selected during the technology phase.
- The application stores the latest successfully fetched data locally so it remains visible while offline.
- Loading, unavailable-data, network-error, and provider-rate-limit states are clearly shown.
- The app does not present delayed or missing market data as real-time data.

## 4. Definitions and MVP rules

- `Latest volume` means the volume for the newest completed trading day provided by the data source.
- `30-day average volume` excludes the latest day, so the comparison uses the prior 30 completed trading days.
- `Volume ratio` is rounded for display but calculated from unrounded values.
- Status thresholds for the first version:
  - Below average: ratio < 0.80
  - Near average: ratio from 0.80 through 1.20
  - Above average: ratio > 1.20
- The initial scope supports U.S.-listed equities only. ETFs and other instruments can be evaluated later.

## 5. Out of scope for the MVP

- Deploying or hosting the app
- Authentication, accounts, and shared watchlists
- Price tracking, technical indicators, news, alerts, or notifications
- Intraday/live volume, pre-market, or after-hours tracking
- Portfolio positions, cost basis, or trade execution
- Mobile-native apps

## 6. Acceptance criteria

- A user can add and remove a valid ticker locally.
- After refresh, each watched ticker shows the required latest-volume comparison data or a clear error state.
- A ticker detail view shows 30 daily volume data points in both chart and table form when the provider has sufficient history.
- Closing and reopening the app preserves the watchlist and the last successful data snapshot.
- The application runs fully on a local machine without deployment configuration.

## 7. Next decision phase

After agreeing on these requirements, choose:

1. Frontend framework and charting approach
2. Backend/API approach
3. Local persistence/database option
4. Market-data provider and its rate-limit/data-delay constraints
5. Local development workflow

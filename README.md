# VynoxPlus Telegram Scheduler

Cloudflare Worker for scheduled Telegram channel posts.

## Schedule

Cron expressions are UTC:
- `30 6 * * *` — 10:00 Iran time (UTC+03:30)
- `30 16 * * *` — 20:00 Iran time (UTC+03:30)

## Cloudflare settings

Configure these on the `vynoxplus-bot` Worker. Never commit credentials:
- Secret `BOT_TOKEN`
- Variable `CHANNEL_ID` (for example `@VynoxPlusVpn`)
- Secret `ADMIN_KEY` (long random value)

Add the bot as a channel administrator with **Post Messages** permission.

## Endpoints

- `GET /health` — reports whether token and channel settings are present.
- `POST /test` — sends a test message; requires `Authorization: Bearer YOUR_ADMIN_KEY`.

Deploy with `npm install` then `npm run deploy`.
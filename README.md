# promptmaxxers-site

The landing + booking surface for [PromptMaxxers](https://promptmaxxers.com).

PromptMaxxers is a paid 1:1 AI coaching + Claude-cert prep cohort business sitting on top of a free Skool funnel ([@promptmaxxers-8987](https://www.skool.com/promptmaxxers-8987)). One teacher: [Gian](https://github.com/gianyrox), founder of [Nucleus Brain](https://nucleus.agfarms.dev) and [AGFarms](https://agfarms.dev).

> Independent prep, not an Anthropic course. Anthropic Academy is the canonical free study source.

## Stack

| Layer | Tool |
|---|---|
| Landing page | Static HTML, no build step |
| Hosting | **Vercel** (auto-deploys on push to `main`) |
| Booking | [Cal.com](https://cal.com/promptmaxxers) (free tier) |
| Payment | Stripe Checkout (one-time + Payment Links) |
| Notifications | Cloudflare Worker → Telegram bot |
| Email | ImprovMX free tier (`hello@promptmaxxers.com` → Gmail) |

**Live:** https://promptmaxxers.com (production once DNS resolves) · https://promptmaxxers-site.vercel.app (preview/fallback)

## Repo layout

```
.
├── public/                   # Cloudflare Pages serves from here
│   ├── index.html
│   ├── welcome/{pack,cohort}.html
│   ├── 404.html
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── _headers
│   └── assets/{styles.css,main.js}
├── webhook/                  # Cloudflare Worker (Cal.com → Telegram)
│   ├── src/index.ts
│   ├── wrangler.toml
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Deploy

### Landing page (Vercel)

Already deployed at https://promptmaxxers-site.vercel.app. Future deploys are automatic on push to `main`.

To deploy manually from CLI:

```sh
vercel --prod
```

Custom domain `promptmaxxers.com` is registered at Vercel and waits for DNS verification:

- Add A record at registrar: `@` → `76.76.21.21`
- Add CNAME at registrar: `www` → `cname.vercel-dns.com.`
- Vercel auto-issues SSL within minutes of DNS resolving.

### Webhook Worker (Cloudflare Workers)

```sh
cd webhook
npm install
npx wrangler login
npx wrangler secret put CAL_WEBHOOK_SECRET     # paste 32+ hex from `openssl rand -hex 32`
npx wrangler secret put TELEGRAM_BOT_TOKEN     # from @BotFather
npx wrangler secret put TELEGRAM_CHAT_ID       # numeric chat id (use @userinfobot to find yours)
npx wrangler deploy
```

After deploy, in Cal.com → Settings → Developer → Webhooks → New webhook:

- Subscriber URL: `https://webhook.promptmaxxers.com/cal`
- Triggers: `BOOKING_CREATED`, `BOOKING_PAID`, `BOOKING_RESCHEDULED`, `BOOKING_CANCELLED`
- Secret: paste the same `CAL_WEBHOOK_SECRET` you set above

## Stripe Payment Links — paste into `public/assets/main.js`

After running the Stripe CLI provisioning script (see `~/agfarms/promptmaxxers/LAUNCH-TODAY.md`), copy the Payment Link URLs into the `STRIPE_LINKS` object in `public/assets/main.js`:

```js
const STRIPE_LINKS = {
  'claude-cohort': 'https://buy.stripe.com/...',
  'github-cohort': 'https://buy.stripe.com/...',
  'pack-5hr':      'https://buy.stripe.com/...',
  'pack-10hr':     'https://buy.stripe.com/...'
};
```

## Local preview

No build needed — just open `public/index.html` in a browser, or:

```sh
cd public && python3 -m http.server 8000
# → http://localhost:8000
```

## License

MIT — see [LICENSE](LICENSE).

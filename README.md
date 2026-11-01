This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on GitHub Pages

The app builds to a fully static site (`output: "export"`) and is deployed by
`.github/workflows/deploy.yml`: the `build` job runs `next build` and uploads
`out/`, and the `deploy` job publishes it with `actions/deploy-pages`.

The site is served from the custom domain `gtaskating.com` at the site root, so
no base path is configured. Enable Pages once under Settings → Pages → Source →
**GitHub Actions**.

Schedules are refreshed weekly by `.github/workflows/scrape.yml`, which commits
the scraped data in `src/data/` and then dispatches the deploy workflow.

Build-time environment variables:

- `NEXT_PUBLIC_GA_ID` — Google Analytics 4 measurement ID; unset disables
  analytics.
- `NEXT_PUBLIC_ADSENSE_CLIENT` — AdSense publisher ID (e.g.
  `ca-pub-0000000000000000`); unset disables the AdSense script.
- `NEXT_PUBLIC_ADSENSE_SLOT` — AdSense ad unit slot ID for the manual unit shown
  under the schedule; unset hides the unit.

Set them as repository variables (Settings → Secrets and variables → Actions →
**Variables**) for deployments, or in `.env.local` for local builds. Only a
single manual ad unit is rendered; keep **Auto ads** off in the AdSense dashboard
so no extra ads are injected.

To preview the production build locally:

```bash
yarn build
yarn start
```

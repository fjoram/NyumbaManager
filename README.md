# NyumbaManager

A rental property management web app for landlords and their agents. Track properties, tenants, lease periods, rent payments (monthly or multi-month advance), maintenance, and reports — all backed by a real database so everyone on your team sees the same data.

## Features

- Dashboard with expected vs collected rent, overdue tenants, vacant properties, and leases ending within 3 months (so you can plan notices)
- Properties, tenants (lease start/end mandatory), payments, and maintenance tracking
- Multi-month advance payments (e.g. 6 months upfront) recorded month by month
- Month-by-month paid/pending breakdown when recording a payment
- Overpayment protection — enforced in the UI **and** on the server
- Reports with filters: monthly collection, yearly property income, tenant statements

## Run it locally

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install          # install dependencies
npx prisma db push   # create the local SQLite database from the schema
npm run dev          # start the app at http://localhost:3000
```

That's it — the local database is a single file at `prisma/dev.db`.

Useful extras:

```bash
npm run db:studio    # visual database browser (Prisma Studio)
```

## Push to GitHub

1. Create an empty repository on GitHub (e.g. `nyumba-manager`). Don't add a README — this folder already has one.
2. From this folder, run:

```bash
git init
git add .
git commit -m "NyumbaManager: rental property management app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nyumba-manager.git
git push -u origin main
```

The `.gitignore` already excludes your local database and `.env` secrets.

## Deploy with a shared database (so your agents can use it)

SQLite is perfect locally, but for a deployed app shared by your team you want hosted Postgres. The free tiers of [Neon](https://neon.tech) or [Supabase](https://supabase.com) work well.

1. **Create a Postgres database** on Neon or Supabase and copy its connection string.
2. **Update `prisma/schema.prisma`** — change the datasource provider:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. **Deploy on [Vercel](https://vercel.com)** (free tier is fine):
   - Import your GitHub repository
   - Add an environment variable `DATABASE_URL` with your Postgres connection string
   - Deploy
4. **Create the tables** in production (run once from your machine):

```bash
DATABASE_URL="your-postgres-connection-string" npx prisma db push
```

Your app is now live, and everyone who opens the URL works against the same database.

> **Important:** the app currently has no login. Anyone with the URL can view and edit your data, so don't share the link publicly. Adding authentication (e.g. with NextAuth or Clerk, with roles for landlord vs agent) is the recommended next step before giving access to agents.

## Project structure

```
pages/index.jsx          The whole UI (dashboard, properties, tenants, payments, maintenance, reports)
pages/api/state.js       GET all data
pages/api/properties.js  Create/update/delete properties
pages/api/tenants.js     Create/update/delete tenants (validates lease dates)
pages/api/payments.js    Record payments in batches (blocks overpayment), delete
pages/api/maintenance.js Create, update status, delete issues
prisma/schema.prisma     Database tables
lib/prisma.js            Database client
```

Amounts are stored as whole numbers (TZS has no cents). Months are stored as `YYYY-MM` strings and dates as `YYYY-MM-DD`.

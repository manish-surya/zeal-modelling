# Zeal Modelling — Setup Instructions

## Prerequisites

Before running this app, you need:
1. Node.js v18+ — check with `node --version`
2. npm — check with `npm --version`
3. Git — check with `git --version`

## Step 1: Install Dependencies

Open Terminal, navigate to this folder and run:

```bash
cd ~/Claude/ZEAL\ Modelling/zeal-modelling
npm install
```

## Step 2: Configure Supabase

1. Go to https://supabase.com and create a new project called `zeal-modelling`
2. Wait for provisioning (~2 minutes)
3. Go to **SQL Editor** and paste + run the contents of `supabase-schema.sql`
4. Go to **Storage** and create 3 private buckets:
   - `user-datasets`
   - `model-artefacts`
   - `exports`
5. Go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
6. Edit `.env.local` and fill in the values

## Step 3: Run locally

```bash
npm run dev
```

Open http://localhost:3000

## Step 4: Deploy to Vercel

1. Push to GitHub:
```bash
git init
git add .
git commit -m "feat: initial Zeal Modelling build"
```
2. Create repo on GitHub: https://github.com/new → `zeal-modelling`
3. Push:
```bash
git remote add origin https://github.com/YOUR_USERNAME/zeal-modelling.git
git branch -M main
git push -u origin main
```
4. Go to https://vercel.com → Add New Project → Import `zeal-modelling`
5. Add environment variables (same as `.env.local`)
6. Click Deploy

## ML Service (Optional)

The app works without the ML service — training jobs will show "not configured".
To enable real training, deploy the FastAPI service (see `ml-service/` directory) and set `ML_SERVICE_URL` in your environment variables.

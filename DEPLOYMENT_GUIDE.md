# Actdone Web App — Production Deployment Guide

This guide describes how to deploy the **Actdone** Todo & Productivity application to the cloud using industry-standard free tiers: **Render** (for the Express API server) and **Vercel** (for the Vite React frontend), backed by your serverless **Neon PostgreSQL** database.

---

## 🏛️ Deployment Architecture

```
💻 User Browser  ────► ⚡ Vercel Frontend (Static Assets)
       │
       ├──────────────► 🚀 Render Backend (Express API Server)
       │                      │
       │                      ▼ (Queries & CTEs)
       │                🐘 Neon Serverless Database
       │
       └──────────────► 🔑 Google Cloud Console (OAuth Flow)
```

---

## 🐘 Step 1: Prepare Your Neon Database

Your Neon production database is already fully set up and optimized with all structural indexes. The connection string format is:
`postgresql://neondb_owner:<YOUR_PASSWORD>@ep-divine-mud-a48myvyt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`

---

## 🚀 Step 2: Deploy the Backend API to Render

[Render](https://render.com/) is a premium, free-tier hosting platform that easily hosts Node.js backend services.

1. Sign up/Log in to [Render](https://dashboard.render.com/) using your GitHub account.
2. Click **New +** on the top right, and select **Web Service**.
3. Select **Connect a repository** and choose your `TODO-WEB-APP` repository.
4. Configure the Web Service settings:
   - **Name**: `actdone-api` (or any custom name)
   - **Environment**: `Node`
   - **Region**: `Oregon (US West)` or `Ohio (US East)` (Select the location closest to US East US-East-1 where your Neon DB resides to minimize DB connection latency!)
   - **Branch**: `main`
   - **Root Directory**: **`backend`** (⚠️ *CRITICAL: This instructs Render to build inside the backend subdirectory.*)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: **`node create-indexes.js && node src/index.js`**
     *(💡 Pure Genius Touch: This start command automatically triggers our programmatic index migration script at startup to ensure all indexes are instantly set up on deployment!)*
5. Click **Advanced** and add the following **Environment Variables**:
   
   | Key | Value | Description |
   | --- | --- | --- |
   | `NODE_ENV` | `production` | Enables Express production optimizations. |
   | `PORT` | `3000` | Port Render binds your API to. |
   | `DATABASE_URL` | *Your Neon database string (e.g. `postgresql://...`)* | Your Neon database string. |
   | `JWT_SECRET` | *Your Secure Random JWT Secret (e.g. `TjM...`)* | Secure secret used to sign JWT cookies. |
   | `GEMINI_API_KEY` | *Your Google Gemini API Key (e.g. `AIz...`)* | Your Google Gemini API Key. |
   | `CLIENT_URL` | *Your Vercel URL (e.g. `https://actdone.vercel.app`)* | You will update this value *after* deploying the frontend in Step 3. |
   | `APP_BASE_URL` | *Your Deployed Render URL (e.g. `https://actdone-api.onrender.com`)* | Your API server's domain. |

6. Click **Create Web Service**. Render will now pull, build, and launch your API! Copy your deployed Render URL (e.g., `https://actdone-api.onrender.com`).

---

## ⚡ Step 3: Deploy the Frontend SPA to Vercel

[Vercel](https://vercel.com/) is the premium hosting home of frontend SPA architectures, providing lightning-fast static assets over global Edge networks.

1. Sign up/Log in to [Vercel](https://vercel.com/) using your GitHub account.
2. Click **Add New** -> **Project**.
3. Import your `TODO-WEB-APP` repository.
4. Configure the Build and Project Settings:
   - **Framework Preset**: Select **Vite** (Vercel will usually auto-detect this).
   - **Root Directory**: Click Edit, select the **`frontend`** directory, and click **Continue**. (⚠️ *CRITICAL: This builds only your React Vite assets.*)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Open the **Environment Variables** dropdown and add:
   
   | Key | Value | Description |
   | --- | --- | --- |
   | `VITE_API_BASE_URL` | *Your Deployed Render URL (e.g. `https://actdone-api.onrender.com`)* | **Ensure there is no trailing slash!** (e.g. `https://actdone-api.onrender.com`). |

6. Click **Deploy**. Vercel will build your static files and deploy your site in less than 30 seconds!
7. Copy your deployed Vercel URL (e.g., `https://actdone.vercel.app`).

---

## 🔑 Step 4: Finalize Configurations (CORS & Google OAuth)

To ensure cookies, fetches, and third-party Google Authentication flow smoothly, you must update two settings after Vercel and Render have finished building:

### 1. Update Render Client URL
- Log back into your **Render Dashboard**.
- Open your `actdone-api` Web Service, click **Environment** in the left sidebar.
- Update `CLIENT_URL` value to your exact Vercel frontend URL: `https://your-app-name.vercel.app`.
- Save changes. Render will automatically redeploy with the correct CORS rules!

### 2. Update Google Cloud OAuth Credentials (Google Login)
If you are using Google Sign-In:
- Go to the [Google Cloud Console](https://console.cloud.google.com/).
- Navigate to **APIs & Services** -> **Credentials**.
- Edit your OAuth 2.0 Client ID.
- Update **Authorized JavaScript Origins** to include your Vercel URL: `https://your-app-name.vercel.app`.
- Update **Authorized Redirect URIs** to include your deployed backend callback URL: `https://your-backend-api.onrender.com/api/auth/google/callback`.
- Save changes (allow 5 minutes for Google to sync DNS rules).

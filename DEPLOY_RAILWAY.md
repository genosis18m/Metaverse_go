# Railway Deployment Guide for Metaverse

## Architecture on Railway

You'll deploy **3 services**:
1. **PostgreSQL** - Database
2. **HTTP Server** - REST API (Go)
3. **WebSocket Server** - Real-time communication (Go)

---

## Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create a new project

---

## Step 2: Add PostgreSQL

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Wait for it to provision
4. Click on the PostgreSQL service → **"Variables"** tab
5. Copy the `DATABASE_URL` value

---

## Step 3: Deploy HTTP Server

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your `2d-metaverse` repository
3. Set **Root Directory**: `go-backend`
4. Add these **Environment Variables**:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | (paste from PostgreSQL) |
| `JWT_SECRET` | (generate a random 32+ char string) |
| `GOOGLE_CLIENT_ID` | (your Google OAuth client ID) |
| `GOOGLE_CLIENT_SECRET` | (your Google OAuth secret) |
| `GOOGLE_REDIRECT_URL` | `https://YOUR-HTTP-SERVICE.railway.app/api/v1/auth/google/callback` |
| `PORT` | `3000` |

5. Railway will auto-deploy from your Dockerfile

---

## Step 4: Deploy WebSocket Server

1. Click **"+ New"** → **"GitHub Repo"** (same repo)
2. Set **Root Directory**: `go-backend`
3. Set **Start Command**: `./ws-server`
4. Add these **Environment Variables**:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | (same as HTTP server) |
| `JWT_SECRET` | (same as HTTP server) |
| `PORT` | `3001` |

---

## Step 5: Deploy Frontend

1. Click **"+ New"** → **"GitHub Repo"** (same repo)
2. Set **Root Directory**: `go-backend/frontend`
3. Add these **Environment Variables**:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://YOUR-HTTP-SERVICE.railway.app` |
| `VITE_WS_URL` | `wss://YOUR-WS-SERVICE.railway.app` |

4. Set **Build Command**: `npm run build`
5. Set **Start Command**: `npx serve dist -s`

---

## Step 6: Update Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client
3. Add to **Authorized redirect URIs**:
   - `https://YOUR-HTTP-SERVICE.railway.app/api/v1/auth/google/callback`

---

## Environment Variables Summary

### HTTP Server
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-super-secret-key-here
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URL=https://http-service.railway.app/api/v1/auth/google/callback
PORT=3000
```

### WebSocket Server
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-super-secret-key-here
PORT=3001
```

### Frontend
```
VITE_API_URL=https://http-service.railway.app
VITE_WS_URL=wss://ws-service.railway.app
```

---

## Notes

- Railway will auto-generate HTTPS URLs for each service
- WebSocket URLs use `wss://` (secure) in production
- Free tier: 500 hours/month (~21 days continuous)
- Add a payment method to lift restrictions

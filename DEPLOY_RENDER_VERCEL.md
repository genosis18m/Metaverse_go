# Deploying Metaverse (Go Backend on Render + React Frontend on Vercel)

This guide walks you through deploying the Go Backend (HTTP and WebSockets) to Render, and deploying the React Frontend to Vercel.

## Step 1: Update render.yaml & Push Changes
We have updated `render.yaml` to ONLY deploy the backend services (`metaverse-http` and `metaverse-ws`). The frontend will be deployed via Vercel.
1. Commit the recent changes to GitHub:
   ```bash
   git add .
   git commit -m "chore: Configure Render for backend and Vercel for frontend"
   git push origin main
   ```

## Step 2: Deploy Backend to Render
1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Blueprint**.
3. Connect your GitHub repository (`genosis18m/Metaverse_go`).
4. Name it (e.g., `metaverse-backend`) and click **Apply**.
5. Render will detect the 2 backend services. Fill in the requested Environment Variables:
   *   **DATABASE_URL**: Your Neon DB Connection String (`postgres://...`). *Append `?sslmode=verify-full` if not present.*
   *   **JWT_SECRET**: Generate a secure random string (e.g., from `openssl rand -hex 32`).
   *   **GOOGLE_CLIENT_ID**: From Google Cloud Console.
   *   **GOOGLE_CLIENT_SECRET**: From Google Cloud Console.
6. Wait for the services to deploy, then note down their public URLs:
   *   **HTTP Backend**: e.g., `https://metaverse-http-xxxx.onrender.com`
   *   **WebSocket Backend**: e.g., `https://metaverse-ws-xxxx.onrender.com`

*Important: Update your Google Cloud Console "Authorized redirect URIs" to `https://<YOUR_RENDER_HTTP_URL>/api/v1/auth/google/callback`.*

## Step 3: Deploy Frontend to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Import your GitHub repository (`genosis18m/Metaverse_go`).
3. **Configure Project**:
   *   **Project Name**: `metaverse-frontend` (or similar)
   *   **Framework Preset**: Vite
   *   **Root Directory**: Click "Edit", select `go-backend/frontend` folder from the repo, then click "Save".
4. **Environment Variables**: Use the Render URLs you got from Step 2.
   *   `VITE_API_URL` = `https://<YOUR_RENDER_HTTP_URL>`
   *   `VITE_WS_URL` = `https://<YOUR_RENDER_WS_URL>`
   *(Note: For WebSockets, typically the URL starts with `wss://` if it's secure, but since Render handles TLS, using `https://` string might be handled by your frontend to convert to `wss://` or you can just explicitly use `wss://metaverse-ws-xxxx.onrender.com` if your frontend expects that. Usually Vite's environment variables are strings.)*
5. Click **Deploy**.

## Expected Architecture
- **Render**: Hosts `metaverse-http` and `metaverse-ws` as Docker web services.
- **Vercel**: Hosts the React static bundle via Vite.

## Testing Your App
1. Open the Vercel deployed frontend URL.
2. Sign in with Google.
3. Once logged in, the frontend connects to your `wss://...` socket correctly!

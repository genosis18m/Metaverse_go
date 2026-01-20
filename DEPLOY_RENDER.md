# Deploying Metaverse to Render (Easiest Way)

Since you already have **Neon DB**, Render is perfect.

## Step 1: Push Changes
Ensure your `render.yaml` and `Dockerfile` are pushed to GitHub:
```bash
git add .
git commit -m "chore: Add Render config"
git push
```

## Step 2: Create "Blueprint" in Render
1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New +** → **Blueprint**
3. Connect your GitHub repository (`Metaverse_go`)
4. Give it a name (e.g., `metaverse`)
5. Click **Apply**

## Step 3: Configure Environment Variables
Render will detect the 3 services asking for Environment Variables. Fill them in:

### For `metaverse-http` & `metaverse-ws`:
*   **DATABASE_URL**: Paste your Neon Connection String (`postgres://...`)
    *   *Make sure to add `?sslmode=verify-full` at the end if not present!*
*   **JWT_SECRET**: Generate a random string (e.g. `openssl rand -hex 32`)
*   **GOOGLE_CLIENT_ID**: From Google Cloud Console
*   **GOOGLE_CLIENT_SECRET**: From Google Cloud Console

### Important Note on Google OAuth
Once deployed, Render will give you a public URL for the HTTP service (e.g., `https://metaverse-http.onrender.com`).
1. Go back to **Google Cloud Console**.
2. Update **Authorized redirect URIs** to:
   `https://YOUR-RENDER-HTTP-URL/api/v1/auth/google/callback`
3. Update the `GOOGLE_REDIRECT_URL` env var in Render if you didn't set it dynamically.

---
**That's it!** Render will deploy:
1. **HTTP Backend**
2. **WebSocket Server**
3. **Frontend** (and automatically link the API URLs!)

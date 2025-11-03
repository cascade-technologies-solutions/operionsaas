# Vercel Environment Variables Setup

## Quick Setup Guide

When deploying to Vercel, you need to set these environment variables in the Vercel Dashboard:

## Required Environment Variables

### 1. `VITE_API_URL`
- **Value:** `https://api.cascade-erp.in/api`
- **Description:** Backend API endpoint URL
- **Environment:** Production, Preview, Development
- **Note:** Use HTTPS to match the frontend domain and prevent mixed content errors

### 2. `VITE_WS_URL`
- **Value:** `wss://api.cascade-erp.in/ws`
- **Description:** WebSocket connection URL
- **Environment:** Production, Preview, Development
- **Note:** Use WSS (secure WebSocket) to match HTTPS

## How to Set in Vercel

1. Go to your project in Vercel Dashboard
2. Click **Settings** → **Environment Variables**
3. Click **Add New**
4. For each variable:
   - Enter the **Key** (e.g., `VITE_API_URL`)
   - Enter the **Value** (e.g., `https://api.cascade-erp.in/api`)
   - Select environments: **Production**, **Preview**, **Development**
   - Click **Save**
5. **Redeploy** your application after adding variables

## Important Notes

- Environment variables are baked into the build at build time
- You must redeploy after changing environment variables
- Vite prefix (`VITE_`) is required for these variables to be accessible in code
- Never commit `.env.production` with real values to Git

## Custom Domain Setup

Once your custom domain `cascade-erp.in` is configured:
- The frontend will be accessible at `https://www.cascade-erp.in`
- The backend API is at `https://api.cascade-erp.in/api`
- Ensure backend `CORS_ORIGINS` includes `https://www.cascade-erp.in`
- Both frontend and backend should use HTTPS to prevent mixed content errors


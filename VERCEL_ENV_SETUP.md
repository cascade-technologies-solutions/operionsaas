# Vercel Environment Variables Setup

## Quick Setup Guide

When deploying to Vercel, you need to set these environment variables in the Vercel Dashboard:

## Required Environment Variables

### 1. `VITE_API_URL`
- **Value:** `http://3.107.223.34:3000/api`
- **Description:** Backend API endpoint URL
- **Environment:** Production, Preview, Development

### 2. `VITE_WS_URL`
- **Value:** `ws://3.107.223.34:3000/ws`
- **Description:** WebSocket connection URL
- **Environment:** Production, Preview, Development

## How to Set in Vercel

1. Go to your project in Vercel Dashboard
2. Click **Settings** → **Environment Variables**
3. Click **Add New**
4. For each variable:
   - Enter the **Key** (e.g., `VITE_API_URL`)
   - Enter the **Value** (e.g., `http://3.107.223.34:3000/api`)
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
- The frontend will be accessible at `https://cascade-erp.in`
- You'll still use the same backend URL (`http://3.107.223.34:3000/api`)
- Ensure backend `CORS_ORIGINS` includes `https://cascade-erp.in`


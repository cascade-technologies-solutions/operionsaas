# Vercel Deployment Quick Start Checklist

Quick reference checklist for deploying to Vercel with custom domain `cascade-erp.in`.

## Pre-Deployment Checklist

- [ ] Code committed to Git repository
- [ ] Local build successful: `cd operion-75 && npm run build`
- [ ] Backend running at `http://3.107.223.34:3000/`
- [ ] Vercel account created
- [ ] GoDaddy account access ready

## Deployment Steps

### 1. Deploy to Vercel

- [ ] Go to [Vercel Dashboard](https://vercel.com/dashboard)
- [ ] Import Git repository
- [ ] Set **Root Directory:** `operion-75`
- [ ] Add environment variables:
  - [ ] `VITE_API_URL` = `http://3.107.223.34:3000/api`
  - [ ] `VITE_WS_URL` = `ws://3.107.223.34:3000/ws`
- [ ] Deploy project
- [ ] Note Vercel URL (e.g., `https://your-project.vercel.app`)

### 2. Connect Custom Domain

- [ ] Vercel Dashboard → Project → Settings → Domains
- [ ] Add domain: `cascade-erp.in`
- [ ] Add domain: `www.cascade-erp.in` (optional)
- [ ] Copy DNS values from Vercel

### 3. Configure GoDaddy DNS

- [ ] Login to [GoDaddy](https://dcc.godaddy.com)
- [ ] Go to DNS Management for `cascade-erp.in`
- [ ] Delete conflicting A/CNAME records
- [ ] Add A record:
  - Name: `@`
  - Value: IP from Vercel (e.g., `76.76.21.21`)
- [ ] Add CNAME record (optional):
  - Name: `www`
  - Value: `cname.vercel-dns.com.` (with trailing dot)

### 4. Update Backend CORS

- [ ] SSH into EC2: `ssh ec2-user@3.107.223.34`
- [ ] Edit backend `.env` file
- [ ] Update `CORS_ORIGINS`:
  ```
  CORS_ORIGINS=https://cascade-erp.in,https://www.cascade-erp.in,https://your-project.vercel.app
  ```
- [ ] Restart backend: `pm2 restart all`

### 5. Verify Deployment

- [ ] Wait 5-60 minutes for DNS propagation
- [ ] Visit `https://cascade-erp.in` (should load)
- [ ] Check SSL certificate (should be valid)
- [ ] Test login functionality
- [ ] Check browser console (no CORS errors)
- [ ] Verify API calls work

## Troubleshooting Quick Fixes

**Domain not resolving?**
→ Wait longer (up to 48 hours, usually 5-60 minutes)
→ Verify DNS records in GoDaddy
→ Check [whatsmydns.net](https://www.whatsmydns.net)

**CORS errors?**
→ Update backend `CORS_ORIGINS` environment variable
→ Restart backend: `pm2 restart all`
→ Check backend logs: `pm2 logs`

**Frontend blank page?**
→ Check browser console for errors
→ Verify environment variables in Vercel
→ Redeploy: Vercel Dashboard → Redeploy

## Documentation Files

- **Full Guide:** `VERCEL_DEPLOYMENT.md`
- **DNS Setup:** `GODADDY_DNS_SETUP.md`
- **Backend CORS:** `BACKEND_CORS_UPDATE.md`
- **Environment Variables:** `VERCEL_ENV_SETUP.md`

## Support

- Vercel Docs: https://vercel.com/docs
- GoDaddy Help: https://www.godaddy.com/help


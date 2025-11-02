# Vercel Deployment Guide with Custom Domain

This guide walks you through deploying the Operion frontend to Vercel and connecting your custom domain `cascade-erp.in` from GoDaddy.

## Prerequisites

- Vercel account (sign up at https://vercel.com)
- Git repository (GitHub, GitLab, or Bitbucket) with your code
- GoDaddy account with domain `cascade-erp.in`
- Backend API running at `http://3.107.223.34:3000/`

## Step 1: Prepare Your Repository

1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Verify build works locally:**
   ```bash
   cd operion-75
   npm install
   npm run build
   ```
   This should create a `dist` folder with no errors.

## Step 2: Deploy to Vercel

### Option A: Using Vercel Dashboard (Recommended)

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**

2. **Click "Add New Project"**

3. **Import your Git repository:**
   - Connect your Git provider (GitHub, GitLab, Bitbucket)
   - Select your repository
   - Click "Import"

4. **Configure Project Settings:**
   - **Framework Preset:** Vite (auto-detected)
   - **Root Directory:** `operion-75`
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `dist` (default)
   - **Install Command:** `npm install` (default)

5. **Add Environment Variables:**
   Click "Environment Variables" and add:
   - `VITE_API_URL` = `http://3.107.223.34:3000/api`
   - `VITE_WS_URL` = `ws://3.107.223.34:3000/ws`
   
   **Important:** Select "Production", "Preview", and "Development" environments for each variable.

6. **Click "Deploy"**
   - Vercel will build and deploy your frontend
   - Wait for deployment to complete (2-3 minutes)

7. **Note your Vercel URL:**
   - After deployment, you'll get a URL like `https://your-project.vercel.app`
   - Keep this URL for backend CORS configuration

### Option B: Using Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy from project directory:**
   ```bash
   cd operion-75
   vercel
   ```
   - Follow prompts to link project
   - Set environment variables when prompted

4. **Deploy to production:**
   ```bash
   vercel --prod
   ```

## Step 3: Connect Custom Domain

1. **Go to Vercel Dashboard → Your Project → Settings → Domains**

2. **Add Domain:**
   - Enter `cascade-erp.in`
   - Enter `www.cascade-erp.in` (optional, for www subdomain)
   - Click "Add"

3. **Vercel will show DNS configuration:**
   - You'll see DNS records to add in GoDaddy
   - Note the values shown (they look like this):
     - **Type:** `A` **Name:** `@` **Value:** `76.76.21.21`
     - **Type:** `CNAME` **Name:** `www` **Value:** `cname.vercel-dns.com.`

## Step 4: Configure DNS in GoDaddy

1. **Login to GoDaddy:**
   - Go to https://dcc.godaddy.com
   - Sign in with your account

2. **Navigate to DNS Management:**
   - Click "My Products"
   - Find your domain `cascade-erp.in`
   - Click "DNS" or "Manage DNS"

3. **Delete existing A and CNAME records (if any):**
   - Remove any conflicting records for root domain (`@`)

4. **Add A Record for root domain:**
   - Click "Add"
   - **Type:** `A`
   - **Name:** `@` (or leave blank, or `cascade-erp.in`)
   - **Value:** Use the IP address from Vercel (usually `76.76.21.21` - verify in Vercel dashboard)
   - **TTL:** `600` (or default)
   - **Click "Save"**

5. **Add CNAME for www subdomain (optional but recommended):**
   - Click "Add"
   - **Type:** `CNAME`
   - **Name:** `www`
   - **Value:** `cname.vercel-dns.com.` (note the trailing dot)
   - **TTL:** `600` (or default)
   - **Click "Save"**

6. **Verify DNS Settings:**
   Your DNS should have:
   - `@` (or blank) → A Record → `76.76.21.21` (or IP from Vercel)
   - `www` → CNAME → `cname.vercel-dns.com.`

## Step 5: Update Environment Variables with Custom Domain

Once your domain is connected and SSL is active:

1. **Go to Vercel Dashboard → Your Project → Settings → Environment Variables**

2. **Update Environment Variables (optional for HTTPS):**
   If you want to use HTTPS for API calls (recommended), update:
   - `VITE_API_URL` = `https://3.107.223.34:3000/api` (if backend supports HTTPS)
   - `VITE_WS_URL` = `wss://3.107.223.34:3000/ws` (if backend supports WSS)

   **Note:** If your backend doesn't have SSL, keep HTTP/WS. Vercel frontend will use HTTPS automatically.

3. **Redeploy:**
   - Go to "Deployments" tab
   - Click the three dots on latest deployment
   - Click "Redeploy"

## Step 6: Update Backend CORS Configuration

**CRITICAL:** You must update your backend to allow requests from your custom domain.

1. **SSH into your EC2 instance:**
   ```bash
   ssh -i your-key.pem ec2-user@3.107.223.34
   ```

2. **Edit backend environment variables:**
   ```bash
   cd /path/to/backend
   nano .env  # or your env file
   ```

3. **Update CORS_ORIGINS:**
   Add your custom domain and Vercel URL:
   ```
   CORS_ORIGINS=https://cascade-erp.in,https://www.cascade-erp.in,https://your-project.vercel.app
   ```
   - Use HTTPS (not HTTP)
   - No spaces after commas
   - No trailing slashes
   - Include both root and www if using both

4. **Restart backend:**
   ```bash
   pm2 restart all
   # or
   npm run pm2:restart
   ```

5. **Verify CORS is working:**
   - Open browser console on `https://cascade-erp.in`
   - Check for CORS errors
   - Try logging in

## Step 7: Verify Deployment

1. **Wait for DNS Propagation:**
   - DNS changes take 5-60 minutes to propagate
   - Check with: `nslookup cascade-erp.in` or [whatsmydns.net](https://www.whatsmydns.net)

2. **Check SSL Certificate:**
   - Vercel automatically provisions SSL certificates
   - Visit `https://cascade-erp.in` (should show green padlock)

3. **Test Frontend:**
   - Open `https://cascade-erp.in`
   - Should load without errors
   - Check browser console for any issues

4. **Test API Connection:**
   - Try logging in
   - Check Network tab in DevTools
   - Verify requests go to `http://3.107.223.34:3000/api`

5. **Test WebSocket:**
   - Check if real-time features work
   - Verify WebSocket connects to `ws://3.107.223.34:3000/ws`

## Troubleshooting

### Domain not resolving

1. **Check DNS propagation:**
   ```bash
   nslookup cascade-erp.in
   dig cascade-erp.in
   ```

2. **Verify DNS records in GoDaddy:**
   - Ensure A record points to Vercel IP
   - Ensure no conflicting records exist

3. **Wait longer:**
   - DNS can take up to 48 hours (usually 5-60 minutes)

### SSL Certificate Issues

1. **Check Vercel Dashboard:**
   - Go to Settings → Domains
   - Check SSL certificate status
   - Should show "Valid" once DNS is configured

2. **If certificate pending:**
   - DNS must be configured correctly first
   - Wait 5-10 minutes after DNS is correct

### CORS Errors

1. **Verify backend CORS_ORIGINS includes your domain:**
   ```bash
   # On EC2
   echo $CORS_ORIGINS
   ```

2. **Check backend logs:**
   ```bash
   pm2 logs
   # Look for CORS warnings/errors
   ```

3. **Test with curl:**
   ```bash
   curl -H "Origin: https://cascade-erp.in" \
        -H "Access-Control-Request-Method: GET" \
        -X OPTIONS \
        http://3.107.223.34:3000/api/health
   ```

### Frontend shows blank page

1. **Check browser console:**
   - Look for JavaScript errors
   - Check Network tab for failed requests

2. **Verify environment variables in Vercel:**
   - Ensure `VITE_API_URL` and `VITE_WS_URL` are set
   - Redeploy after changing environment variables

3. **Check build logs:**
   - Go to Vercel Dashboard → Deployments → Select deployment → View build logs

### API requests failing

1. **Check backend is accessible:**
   ```bash
   curl http://3.107.223.34:3000/health
   ```

2. **Verify backend CORS includes frontend domain:**
   - Must include `https://cascade-erp.in` in `CORS_ORIGINS`

3. **Check Security Groups on EC2:**
   - Ensure port 3000 is open to `0.0.0.0/0` or Vercel IPs

## Maintenance

### Updating Deployment

1. **Push changes to Git:**
   ```bash
   git push origin main
   ```

2. **Vercel auto-deploys:**
   - Vercel automatically deploys on push to main branch
   - Check Vercel dashboard for deployment status

### Environment Variable Updates

1. **Update in Vercel Dashboard:**
   - Settings → Environment Variables
   - Edit values as needed

2. **Redeploy:**
   - Deployments → Latest → Redeploy

## Security Notes

- **HTTPS:** Vercel automatically provides SSL certificates
- **Environment Variables:** Never commit `.env.production` to Git
- **Backend CORS:** Only allow your frontend domains
- **API Keys:** Keep backend API URL secure (though it's visible in frontend code)

## Support

- Vercel Documentation: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
- GoDaddy DNS Help: https://www.godaddy.com/help


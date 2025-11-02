# Backend CORS Configuration Update

## Critical: Update Backend CORS After Frontend Deployment

After deploying your frontend to Vercel with custom domain `cascade-erp.in`, you **MUST** update your backend CORS configuration to allow requests from your frontend domain.

## Step 1: SSH into EC2 Instance

```bash
ssh -i your-key.pem ec2-user@3.107.223.34
```

Or use your preferred SSH method.

## Step 2: Locate Environment File

Find where your backend environment variables are stored:

```bash
cd /path/to/backend
# Usually in:
# - .env
# - .env.production
# - ecosystem.config.cjs (if using PM2)
```

## Step 3: Update CORS_ORIGINS

Edit your environment file:

```bash
nano .env
# or
nano .env.production
# or
nano ecosystem.config.cjs
```

### Add to CORS_ORIGINS:

Include your custom domain and Vercel URL:

```
CORS_ORIGINS=https://cascade-erp.in,https://www.cascade-erp.in,https://your-project.vercel.app
```

**Important Formatting:**
- ✅ Use HTTPS (not HTTP)
- ✅ No spaces after commas
- ✅ No trailing slashes
- ✅ Include both root (`cascade-erp.in`) and www (`www.cascade-erp.in`) if using both
- ✅ Include your Vercel URL as backup

### Example:

```env
# Before (only localhost for development)
CORS_ORIGINS=http://localhost:8080

# After (production domains)
CORS_ORIGINS=https://cascade-erp.in,https://www.cascade-erp.in,https://your-project.vercel.app
```

## Step 4: Restart Backend

### If using PM2:

```bash
pm2 restart all
# or
pm2 restart ecosystem.config.cjs
```

### If using npm:

```bash
npm run pm2:restart
```

### If using systemd:

```bash
sudo systemctl restart your-backend-service
```

## Step 5: Verify CORS Configuration

### Check Backend Logs:

```bash
pm2 logs
# or
pm2 logs backend
```

Look for:
```
✅ CORS configured for production origins: { origins: ['https://cascade-erp.in', ...] }
```

### Test from Browser:

1. Open `https://cascade-erp.in` in browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Try logging in or making an API call
5. **Should see NO CORS errors**

### Test with curl:

```bash
curl -H "Origin: https://cascade-erp.in" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://3.107.223.34:3000/api/health \
     -v
```

Should return headers like:
```
Access-Control-Allow-Origin: https://cascade-erp.in
Access-Control-Allow-Credentials: true
```

## Troubleshooting

### CORS still blocking requests

1. **Verify environment variable is loaded:**
   ```bash
   # On EC2
   echo $CORS_ORIGINS
   # Should show your domains
   ```

2. **Check backend logs for CORS warnings:**
   ```bash
   pm2 logs | grep -i cors
   ```

3. **Ensure no typos in domain:**
   - Check for `http://` vs `https://`
   - Check for trailing slashes
   - Check for spaces

4. **Restart backend again:**
   ```bash
   pm2 restart all
   ```

### Backend not reading environment variable

1. **Check where environment is loaded:**
   ```bash
   # Check PM2 ecosystem file
   cat ecosystem.config.cjs
   
   # Check if .env is being loaded
   ls -la | grep env
   ```

2. **Verify variable format:**
   - No quotes around values
   - No spaces around `=`
   - Proper comma separation

### Still having issues?

Check backend source code for how CORS_ORIGINS is parsed:
- Location: `Backend/src/server.ts`
- Function: `getCorsOrigins()`
- Expects comma-separated string

## Quick Reference

```bash
# 1. SSH to EC2
ssh -i key.pem ec2-user@3.107.223.34

# 2. Edit environment
nano .env

# 3. Update CORS_ORIGINS (add this line or modify existing)
CORS_ORIGINS=https://cascade-erp.in,https://www.cascade-erp.in,https://your-project.vercel.app

# 4. Save and exit (Ctrl+X, Y, Enter in nano)

# 5. Restart backend
pm2 restart all

# 6. Check logs
pm2 logs
```


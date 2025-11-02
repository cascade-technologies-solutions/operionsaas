# GoDaddy DNS Configuration for Vercel

This guide shows you exactly what DNS records to add in GoDaddy to connect `cascade-erp.in` to Vercel.

## Step-by-Step Instructions

### 1. Login to GoDaddy

1. Go to https://dcc.godaddy.com
2. Sign in with your GoDaddy account credentials

### 2. Access DNS Management

1. Click **"My Products"** in the top navigation
2. Find your domain **`cascade-erp.in`** in the list
3. Click the **"DNS"** button (or **"Manage DNS"**)

### 3. Delete Conflicting Records

Before adding new records, remove any existing conflicting records:

1. Look for any existing **A** records for `@` (root domain)
2. Look for any existing **CNAME** records for `www`
3. Click the **"Delete"** button (trash icon) next to conflicting records
4. Confirm deletion

### 4. Get Vercel DNS Values

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Domains**
4. Add your domain: `cascade-erp.in`
5. **Copy the DNS values** that Vercel shows you

Typically these will be:
- **A Record:** IP address like `76.76.21.21` (verify in Vercel)
- **CNAME:** `cname.vercel-dns.com.` (with trailing dot)

### 5. Add A Record for Root Domain

1. In GoDaddy DNS page, click **"Add"** button
2. Fill in:
   - **Type:** Select **"A"** from dropdown
   - **Name:** Enter **`@`** (represents root domain)
   - **Value:** Paste the IP address from Vercel (e.g., `76.76.21.21`)
   - **TTL:** `600` seconds (or leave default)
3. Click **"Save"**

### 6. Add CNAME Record for WWW (Optional but Recommended)

1. Click **"Add"** button again
2. Fill in:
   - **Type:** Select **"CNAME"** from dropdown
   - **Name:** Enter **`www`**
   - **Value:** Paste CNAME from Vercel (e.g., `cname.vercel-dns.com.`)
     - **Important:** Include the trailing dot (`.`) at the end
   - **TTL:** `600` seconds (or leave default)
3. Click **"Save"**

### 7. Verify Your DNS Records

After adding, your DNS records should look like this:

```
Type    Name    Value                      TTL
A       @       76.76.21.21               600
CNAME   www     cname.vercel-dns.com.     600
```

### 8. Wait for DNS Propagation

- DNS changes typically take **5-60 minutes** to propagate globally
- You can check propagation status at:
  - [whatsmydns.net](https://www.whatsmydns.net/#A/cascade-erp.in)
  - [dnschecker.org](https://dnschecker.org/#A/cascade-erp.in)

### 9. Verify in Vercel

1. Go back to Vercel Dashboard → Your Project → Settings → Domains
2. Check status of `cascade-erp.in`
3. Should show:
   - **Configuration:** Valid (once DNS propagates)
   - **SSL Certificate:** Valid (auto-provisioned by Vercel)

## Common Issues

### DNS not resolving

- **Wait longer:** Can take up to 48 hours (usually 5-60 minutes)
- **Check propagation:** Use [whatsmydns.net](https://www.whatsmydns.net)
- **Verify records:** Double-check values are correct

### SSL Certificate pending

- DNS must be configured correctly first
- Wait 5-10 minutes after DNS is correct
- Vercel automatically provisions SSL

### www subdomain not working

- Ensure CNAME record for `www` exists
- Verify value includes trailing dot: `cname.vercel-dns.com.`
- Wait for DNS propagation

## Visual Guide

```
GoDaddy DNS Management Page:
┌─────────────────────────────────────┐
│ DNS Records                        │
├─────────────────────────────────────┤
│ Type  │ Name │ Value              │
├───────┼──────┼─────────────────────┤
│ A     │ @    │ 76.76.21.21        │ ← Add this
│ CNAME │ www  │ cname.vercel-dns...│ ← Add this
└─────────────────────────────────────┘
```

## Support

- GoDaddy Help: https://www.godaddy.com/help
- Vercel DNS Help: https://vercel.com/docs/concepts/projects/domains
- GoDaddy Support: Available 24/7 in dashboard


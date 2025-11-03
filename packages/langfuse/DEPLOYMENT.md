# Langfuse Railway Deployment Guide

**Status:** Ready to deploy  
**Time Required:** ~10 minutes  
**Cost:** Free tier available, production ~$5-20/month

---

## Quick Deploy

### Step 1: Deploy to Railway (2 minutes)

1. **Click this link:** https://railway.com/new/template/exma_H
2. **Sign in** to Railway (or create free account)
3. **Name your project:** `kijko-langfuse` (or your preference)
4. **Click "Deploy"** - Railway will automatically provision:
   - ✅ PostgreSQL database
   - ✅ Redis cache
   - ✅ ClickHouse analytics
   - ✅ MinIO blob storage
   - ✅ Langfuse web app

### Step 2: Wait for Deployment (5-10 minutes)

Watch the Railway dashboard as services start up. You'll see:
- ✅ Database provisioning
- ✅ Container building
- ✅ Service health checks
- ✅ URL generation

### Step 3: Access Your Langfuse Instance

1. Once deployed, Railway shows your app URL: `https://<your-app-name>.up.railway.app`
2. Click **"Open App"** or visit the URL
3. You'll see the Langfuse login page
4. **Create your admin account** on first visit

### Step 4: Get API Keys (1 minute)

1. Log in to your Langfuse dashboard
2. Go to **Settings → API Keys**
3. **Generate new API key pair:**
   - Public Key: `pk-lf-...` (safe for client-side)
   - Secret Key: `sk-lf-...` (keep secure!)
4. **Copy both keys** - you'll need them for environment variables

---

## Configure Your App

### For Apps Using @kijko/langfuse

Add to your app's `.env` or `.env.local`:

```bash
# Langfuse Configuration
LANGFUSE_SECRET_KEY=sk-lf-YOUR_SECRET_KEY_HERE
LANGFUSE_PUBLIC_KEY=pk-lf-YOUR_PUBLIC_KEY_HERE
LANGFUSE_BASE_URL=https://your-app-name.up.railway.app
LANGFUSE_ENABLED=true

# Optional: Performance tuning
LANGFUSE_FLUSH_AT=15
LANGFUSE_FLUSH_INTERVAL=1000

# For client-side tracing (optional)
NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY=pk-lf-YOUR_PUBLIC_KEY_HERE
```

### For Next.js Apps

1. **Enable instrumentation** in `next.config.ts`:
   ```ts
   const nextConfig = {
     experimental: {
       instrumentationHook: true,
     },
   };
   ```

2. **Create** `instrumentation.ts` in app root:
   ```ts
   export async function register() {
     if (process.env.NEXT_RUNTIME === 'nodejs') {
       const { initializeLangfuseTelemetry } = await import('@kijko/langfuse');
       initializeLangfuseTelemetry();
     }
   }
   ```

---

## Verify It's Working

### Test 1: Check Dashboard

1. Visit your Langfuse URL
2. Log in successfully
3. Navigate around the dashboard
4. Check that API Keys page loads

### Test 2: Send Test Trace

```ts
import { createLangfuseObservation } from '@kijko/langfuse';

const observation = createLangfuseObservation({
  name: 'TestTrace',
  metadata: { test: true },
});

observation.end({ output: 'Hello from Kijko!' });
```

Run your app and check the Langfuse dashboard for the trace.

### Test 3: Check Console Logs

Look for:
```
[Langfuse] Client initialized successfully
```

---

## Troubleshooting

### Issue: "Traces not appearing"

**Solutions:**
1. Check environment variables are set correctly
2. Ensure `LANGFUSE_ENABLED=true`
3. Call `flushLangfuse()` in serverless environments:
   ```ts
   import { flushLangfuse } from '@kijko/langfuse';
   await flushLangfuse();
   ```
4. Check Railway logs for errors

### Issue: "Connection refused"

**Solutions:**
1. Verify Railway deployment completed successfully
2. Check LANGFUSE_BASE_URL matches your Railway URL
3. Ensure no trailing slash in BASE_URL
4. Wait 1-2 minutes after deployment for DNS propagation

### Issue: "Invalid API keys"

**Solutions:**
1. Regenerate keys in Langfuse dashboard
2. Copy keys carefully (no extra spaces)
3. Check `pk-lf-` prefix for public key
4. Check `sk-lf-` prefix for secret key

---

## Railway Configuration

### Environment Variables Set by Template

Railway automatically configures:
- `POSTGRES_URL` - Database connection
- `REDIS_URL` - Cache connection
- `CLICKHOUSE_URL` - Analytics database
- `MINIO_URL` - Blob storage
- `NEXTAUTH_SECRET` - Session secret
- `NEXTAUTH_URL` - Public app URL
- `NODE_ENV=production`

You don't need to modify these.

### Optional Customizations

```bash
# Set in Railway dashboard → Variables

# Logging
LOG_LEVEL=info

# Custom domain (if you have one)
NEXTAUTH_URL=https://langfuse.yourdomain.com

# Email notifications (optional)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_key
```

---

## Production Checklist

- [ ] Langfuse deployed to Railway
- [ ] Admin account created
- [ ] API keys generated and saved securely
- [ ] Environment variables configured in all apps
- [ ] Instrumentation enabled in Next.js apps
- [ ] Test trace sent successfully
- [ ] Dashboard accessible and working
- [ ] Console shows "Client initialized successfully"

---

## Cost Estimates

**Railway Pricing:**
- Free tier: $5 credit/month (good for testing)
- Hobby: $5/month (small projects)
- Pro: $20/month (production recommended)

**Resource Usage:**
- PostgreSQL: ~$5-10/month
- Redis: ~$3-5/month
- ClickHouse: ~$5-10/month
- MinIO: ~$2-3/month
- App container: ~$5/month

**Total: ~$20-35/month for production usage**

---

## Security Best Practices

1. **Never commit API keys** - use environment variables
2. **Use secret keys** only on backend
3. **Public keys** can be used client-side
4. **Enable Railway firewall** if available
5. **Rotate keys** quarterly
6. **Monitor usage** in Railway dashboard

---

## Next Steps

After deployment:
1. Instrument key AI operations (see README.md)
2. Add tracing to Gemini calls
3. Set up Sentry integration for error correlation
4. Configure alerts in Langfuse dashboard
5. Review traces regularly for performance issues

---

## Resources

- [Langfuse Documentation](https://langfuse.com/docs)
- [Railway Langfuse Template](https://railway.com/new/template/exma_H)
- [Self-Hosting Guide](https://langfuse.com/self-hosting/deployment/railway)
- [Package README](./README.md)

---

**Last Updated:** 2025-11-03  
**Status:** Ready for deployment

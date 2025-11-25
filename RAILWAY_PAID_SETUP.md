# Railway Paid Plan Deployment - TN Credit Solutions

Railway is the simplest platform to deploy your full-stack Node.js app. With a paid plan, you get reliable hosting and database included.

## Prerequisites
- GitHub account (already have this)
- Railway account (create at [railway.app](https://railway.app))
- Credit card (for paid plan - approximately $5-15/month)
- Your code on GitHub: `https://github.com/tncreditsolutions/Website`

---

## Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click **"Start Free"**
3. Sign up with GitHub
4. Authorize Railway to access your GitHub
5. Complete verification

---

## Step 2: Create New Project

1. Click **"+ New Project"**
2. Select **"Deploy from GitHub repo"**
3. Search for: **tncreditsolutions/Website**
4. Select it and click **"Deploy"**

Railway auto-detects it's a Node.js project and starts setup.

---

## Step 3: Add PostgreSQL Database

While your app is deploying:

1. In your Railway project, click **"+ Add Service"**
2. Select **"Database"**
3. Choose **"PostgreSQL"**

Railway automatically:
- Creates a PostgreSQL database
- Sets `DATABASE_URL` environment variable
- Connects it to your Node.js service

---

## Step 4: Set Environment Variables

Railway auto-sets `DATABASE_URL`. You need to add these:

1. Click the **Node.js service** box
2. Click **"Variables"** tab
3. Click **"Add Variable"** and add these one by one:

| Name | Value |
|------|-------|
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | `bf7414a8280df2771625d50f5375aaf56a9d6f553ac775a6ff2483eec8ae95b1` |
| `PORT` | `5000` |

4. Click **"Save"**

---

## Step 5: Wait for Build

Railway automatically:
- Installs dependencies (`npm install`)
- Builds your app (`npm run build`)
- Starts your server (`npm start`)

Watch the logs. You should see "✓ Deployment successful" after 3-5 minutes.

---

## Step 6: Get Your Live URL

1. Click the **Node.js service**
2. Look for **"Domains"** section
3. You'll see a URL like: `https://website-production-xxxx.railway.app`

This is your live website!

---

## Step 7: Initialize Database

Your database exists, but tables need to be created.

**Option A: From Railway Shell (Easiest)**
1. Click the **Node.js service**
2. Click **"Shell"** tab
3. Run:
   ```bash
   npm run db:push
   ```

This creates all your database tables. Takes ~30 seconds.

**Option B: From Your Computer**
```bash
# Get DATABASE_URL from Railway Variables
# Then run locally:
export DATABASE_URL="<your-database-url>"
npm run db:push
```

---

## Step 8: Verify Your Deployment

1. Visit your Railway URL
2. Test:
   - ✅ Homepage loads
   - ✅ Fill out contact form → submit → check /admin
   - ✅ Visit /privacy, /terms, /disclaimer
   - ✅ Live chat widget appears

---

## Success! You're Live ✅

Your website is now running on Railway with:
- ✅ Node.js backend
- ✅ React frontend
- ✅ PostgreSQL database
- ✅ Live chat widget (Tawk.to)
- ✅ Contact form with admin dashboard
- ✅ All legal pages

---

## Upgrade to Paid Plan

Railway has a free $5 credit, but after that you need to upgrade:

1. Click **Account** → **Billing**
2. Add your credit card
3. Switch to **"Pay as you go"** plan

**Typical costs:**
- Node.js server: ~$5/month
- PostgreSQL database: ~$15/month
- **Total: ~$20/month** (very affordable)

---

## Your Live URLs

| Page | URL |
|------|-----|
| Home | `https://website-production-xxxx.railway.app` |
| Admin | `https://website-production-xxxx.railway.app/admin` |
| Privacy | `https://website-production-xxxx.railway.app/privacy` |
| Terms | `https://website-production-xxxx.railway.app/terms` |
| Disclaimer | `https://website-production-xxxx.railway.app/disclaimer` |

---

## Optional: Custom Domain

1. Go to Railway project → **Settings**
2. Add custom domain (e.g., `tncreditsolutions.com`)
3. Update DNS records at your domain registrar
4. Railway auto-provisions HTTPS certificate

---

## Key Features

**Auto-Deploy on GitHub Push**
- Edit code locally
- Push to GitHub
- Railway auto-deploys new version

**View Logs Anytime**
- Click Node.js service → **Logs**
- See real-time output
- Debug issues

**Environment Variables**
- Click Node.js service → **Variables**
- Update anytime without redeploying

**Database Backups**
- Railway auto-backs up PostgreSQL
- Access in Postgres service

---

## Troubleshooting

### Build Fails
- Check Logs tab for error messages
- Ensure all dependencies in package.json

### White Screen / 404
- Wait 3-5 minutes for build to complete
- Check that Postgres is running (green status)
- Verify all env variables set
- Check Logs for errors

### Contact Form Not Saving
- Run `npm run db:push` from Shell
- Verify DATABASE_URL is set
- Check Logs for database errors

### Database Connection Error
- Verify DATABASE_URL in Variables
- Check Postgres service is "Running" (green)
- Try running `npm run db:push` again

---

## Key Commands from Railway Shell

```bash
# Create database tables
npm run db:push

# View environment variables (safe)
echo $NODE_ENV

# Restart Node service
exit  # (then click restart in dashboard)

# Check app status
npm start
```

---

## Support

- Railway Docs: [railway.app/docs](https://railway.app/docs)
- Deployment Status: Check Railway dashboard Logs
- Website Issues: Contact form on your site

---

## Summary

1. ✅ Sign up at [railway.app](https://railway.app)
2. ✅ Deploy from GitHub repo
3. ✅ Add PostgreSQL database
4. ✅ Set environment variables
5. ✅ Run `npm run db:push` in Shell
6. ✅ Visit your live URL
7. ✅ Upgrade to paid when free credit runs out

**That's it! Your TN Credit Solutions website is live! 🚀**

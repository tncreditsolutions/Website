# Railway Deployment Guide - TN Credit Solutions

Railway is the easiest way to deploy your full-stack Node.js app. Follow these steps to get live in minutes.

## Prerequisites
- GitHub account (already have this)
- Railway account (free - create at [railway.app](https://railway.app))
- Your code pushed to GitHub at `https://github.com/tncreditsolutions/Website`

---

## Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click **"Start Free"**
3. Sign up with GitHub (easiest option)
4. Authorize Railway to access your GitHub account

---

## Step 2: Create New Project

1. After login, click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Search for and select: **tncreditsolutions/Website**
4. Click **"Create"**

Railway will auto-detect this is a Node.js project and start the process.

---

## Step 3: Add PostgreSQL Database

1. In your Railway project, click **"+ Add Service"**
2. Select **"Database"**
3. Choose **"PostgreSQL"**
4. Railway auto-creates the database and provides connection string

---

## Step 4: Set Environment Variables

This is critical! Railway automatically creates `DATABASE_URL`, but you need to set others:

1. In your Railway project, click the **Node.js service**
2. Click **"Variables"** tab
3. Add these variables:

```
NODE_ENV=production
SESSION_SECRET=generate-a-random-strong-secret-here
PORT=5000
```

**How to generate SESSION_SECRET:**
- Option A: Use online generator: [random.org](https://www.random.org/strings/)
- Option B: Run in terminal: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Make it at least 32 characters

---

## Step 5: Configure Build Settings

1. Click the **Node.js service** 
2. Go to **"Settings"** tab
3. Verify:
   - **Start Command**: `npm start`
   - **Build Command**: `npm run build`
   - **Install Command**: `npm install`

(Railway usually auto-detects these correctly)

---

## Step 6: Deploy

1. Click **"Deploy"** button
2. Watch the build logs (should take 2-5 minutes)
3. Once complete, Railway provides your live URL like: `https://your-app-name.up.railway.app`

---

## Step 7: Initialize Database

After deployment, your database tables need to be created:

**Option A: From Railway Dashboard**
1. Go to PostgreSQL service in Railway
2. Click **"Connect"**
3. Run this command locally or in your terminal:
```bash
npm run db:push
```

**Option B: Using Railway CLI**
1. Install Railway CLI: `npm install -g @railway/cli`
2. Run: `railway login`
3. Run: `railway link` (select your project)
4. Run: `npm run db:push`

---

## Step 8: Verify Your Deployment

1. Visit your Railway URL: `https://your-app-name.up.railway.app`
2. Your TN Credit Solutions website should be live!
3. Test:
   - Fill out contact form (should save to database)
   - Visit /admin to see submissions
   - Visit legal pages: /privacy, /terms, /disclaimer
   - Check live chat widget is working

---

## Success! Your App is Live

Your production website is now running on Railway with:
- ✅ Node.js backend
- ✅ React frontend
- ✅ PostgreSQL database
- ✅ Live chat widget (Tawk.to)
- ✅ Contact form with lead tracking
- ✅ Admin dashboard

---

## Next Steps (Optional)

### Custom Domain
1. In Railway project → **Settings**
2. Add custom domain (e.g., tncreditsolutions.com)
3. Update your DNS records at your domain registrar

### Environment-Specific Variables
If you need different values for different environments, Railway lets you create multiple projects.

### Monitoring & Logs
1. Click **"Logs"** tab to see real-time logs
2. Check for errors or issues
3. Railway shows deployment history and rollback options

### Database Backups
Railway automatically backs up your database, but you can also:
1. Export data from Railway dashboard
2. Schedule automated backups

---

## Troubleshooting

### Deploy Fails During Build
- Check build logs in Railway dashboard
- Ensure all dependencies are in package.json
- Run `npm install` locally to verify packages work

### White Screen / 404 Errors
- Wait 1-2 minutes for full deployment
- Check that DATABASE_URL is set
- Verify SESSION_SECRET is configured
- Check logs for error messages

### Database Connection Error
- Verify DATABASE_URL is auto-set by Railway PostgreSQL service
- Check that `npm run db:push` was executed
- Ensure PostgreSQL service is running (check in Railway dashboard)

### Contact Form Not Saving
- Check DATABASE_URL in Variables
- Verify database tables were created: `npm run db:push`
- Check admin page to see if submissions are there

---

## Key URLs After Deployment

| Page | URL |
|------|-----|
| Home | `https://your-app-name.up.railway.app` |
| Admin Dashboard | `https://your-app-name.up.railway.app/admin` |
| Privacy Policy | `https://your-app-name.up.railway.app/privacy` |
| Terms of Service | `https://your-app-name.up.railway.app/terms` |
| Disclaimer | `https://your-app-name.up.railway.app/disclaimer` |

---

## Support & Resources

- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Railway Community: [Discord](https://discord.gg/railway)
- Contact Form: Available on your deployed website
- Live Chat: Tawk.to widget on your site

Your TN Credit Solutions website is now production-ready! 🚀

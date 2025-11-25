# Render Deployment Guide - TN Credit Solutions

Render is a free alternative to Railway that's perfect for deploying full-stack Node.js apps. Follow these steps to get live in minutes.

## Prerequisites
- GitHub account (already have this)
- Render account (free - create at [render.com](https://render.com))
- Your code pushed to GitHub at `https://github.com/tncreditsolutions/Website`

---

## Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Click **"Get Started"**
3. Sign up with GitHub (easiest option)
4. Authorize Render to access your GitHub account

---

## Step 2: Create Web Service

1. After login, click **"+ New +"**
2. Select **"Web Service"**
3. Search for and select your repository: **tncreditsolutions/Website**
4. Click **"Connect"**

---

## Step 3: Configure Web Service

Fill in the configuration form:

| Field | Value |
|-------|-------|
| **Name** | `tn-credit-solutions` (or your preferred name) |
| **Environment** | `Node` |
| **Region** | Pick closest to you (e.g., US, EU) |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

Click **"Advanced"** and enable "Auto-deploy" (optional but recommended)

---

## Step 4: Add Environment Variables

1. Scroll down to **"Environment"** section
2. Click **"Add Environment Variable"**
3. Add these variables (click "+ Add Environment Variable" after each):

```
NODE_ENV = production
SESSION_SECRET = bf7414a8280df2771625d50f5375aaf56a9d6f553ac775a6ff2483eec8ae95b1
PORT = 5000
```

**Do NOT add DATABASE_URL yet** - we'll create PostgreSQL first

---

## Step 5: Create PostgreSQL Database

Before you deploy the web service, create a PostgreSQL database:

1. From Render dashboard, click **"+ New +"**
2. Select **"PostgreSQL"**
3. Fill in:
   - **Name**: `tn-credit-solutions-db`
   - **Database**: `tn_credit_solutions`
   - **User**: `postgres` (default)
   - **Region**: Same as your web service
   - **Free plan**: Should be selected
4. Click **"Create Database"**

Wait for it to finish creating (~2-3 minutes)

---

## Step 6: Connect Database to Web Service

1. After database is created, Render shows a connection string
2. **Copy the Internal Database URL** (should look like `postgresql://user:password@host:5432/database`)
3. Go back to your **Web Service** settings
4. Click **"Environment"**
5. Click **"Add Environment Variable"**
6. Add: `DATABASE_URL = <paste-your-internal-url>`
7. Click **"Save"**

---

## Step 7: Deploy Web Service

1. Go to your **Web Service** (from dashboard)
2. Click **"Create Web Service"** button
3. Render starts building and deploying
4. Wait for deployment to complete (watch the logs)
5. Once deployed, you'll see a URL like: `https://tn-credit-solutions.onrender.com`

---

## Step 8: Initialize Database

After deployment succeeds, create your database tables:

1. **From Local Terminal** (on your computer):
   ```bash
   # Clone your repo locally if you haven't
   git clone https://github.com/tncreditsolutions/Website
   cd Website
   
   # Set the database URL
   export DATABASE_URL="<your-internal-database-url>"
   
   # Create tables
   npm run db:push
   ```

**OR from Render Dashboard:**
1. Click your Web Service
2. Click **"Shell"** tab
3. Run: `npm run db:push`

---

## Step 9: Verify Your Deployment

1. Visit your Render URL: `https://tn-credit-solutions.onrender.com` (or your custom name)
2. Your TN Credit Solutions website should be live!
3. Test:
   - Fill out contact form (should save to database)
   - Visit /admin to see submissions
   - Visit legal pages: /privacy, /terms, /disclaimer
   - Check live chat widget is working

---

## Success! Your App is Live

Your production website is now running on Render with:
- ✅ Node.js backend
- ✅ React frontend
- ✅ PostgreSQL database
- ✅ Live chat widget (Tawk.to)
- ✅ Contact form with lead tracking
- ✅ Admin dashboard
- ✅ Free tier (750 compute hours/month)

---

## Next Steps (Optional)

### Custom Domain
1. In Render Web Service → **Settings**
2. Scroll to "Custom Domain"
3. Add your domain (e.g., tncreditsolutions.com)
4. Update your DNS records at your domain registrar

### Auto-Deploys from GitHub
Render can auto-deploy when you push to GitHub:
1. Web Service → **Settings**
2. Enable "Auto-Deploy"
3. Every git push triggers a new deployment

### View Logs
1. Web Service → **Logs** tab
2. See real-time output from your app
3. Debug issues here

### Database Backups
Render automatically backs up your database. You can also:
1. Use PostgreSQL tools to export/backup manually
2. Access via Render's database shell

---

## Troubleshooting

### Deploy Fails During Build
- Check build logs in Render dashboard
- Ensure all dependencies are in package.json
- Run `npm install` locally to verify packages

### White Screen / Cannot Access Site
- Wait 2-3 minutes for full deployment
- Check that Web Service shows "Live" status
- Check logs for error messages
- Verify DATABASE_URL is set correctly

### Database Connection Error
- Verify DATABASE_URL is correct Internal URL
- Check that PostgreSQL database is running (check Render dashboard)
- Try running `npm run db:push` again
- Ensure firewall allows connection

### Contact Form Not Saving
- Check DATABASE_URL environment variable
- Verify database tables were created: `npm run db:push`
- Check Web Service logs for errors
- Visit /admin to test submission

### App Crashes After Deploy
- Check logs in Render dashboard
- Verify all environment variables are set
- Check that DATABASE_URL matches your database credentials
- Restart the Web Service from dashboard

---

## Key URLs After Deployment

| Page | URL |
|------|-----|
| Home | `https://tn-credit-solutions.onrender.com` |
| Admin Dashboard | `https://tn-credit-solutions.onrender.com/admin` |
| Privacy Policy | `https://tn-credit-solutions.onrender.com/privacy` |
| Terms of Service | `https://tn-credit-solutions.onrender.com/terms` |
| Disclaimer | `https://tn-credit-solutions.onrender.com/disclaimer` |

---

## Important Notes

### Free Tier Limits
- 750 free compute hours per month (~1 month of continuous running)
- If app goes dormant (no requests for 15 minutes), it spins down
- First request after spin-down takes 30 seconds (then fast)
- Free PostgreSQL tier: 100 MB storage

### Keep App Awake (Optional)
If you want your app always responsive:
1. Upgrade to paid tier (starts at $7/month)
2. Or keep the free tier and accept the 30-second first response after idle

### Pricing
- Free tier: $0/month
- Paid tier: $7/month and up
- Database add-on: $15/month for production database
- You can stay on free tier comfortably for a business website

---

## Support & Resources

- Render Docs: [render.com/docs](https://render.com/docs)
- Render Community: [Discord](https://discord.gg/render)
- Contact Form: Available on your deployed website
- Live Chat: Tawk.to widget on your site

**Congratulations! Your TN Credit Solutions website is now live on Render! 🚀**

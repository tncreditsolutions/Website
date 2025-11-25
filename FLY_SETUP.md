# Fly.io Deployment Guide - TN Credit Solutions

Fly.io offers a generous free tier perfect for deploying full-stack Node.js apps with PostgreSQL databases.

## Prerequisites
- GitHub account (already have this)
- Fly.io account (free - create at [fly.io](https://fly.io))
- Your code pushed to GitHub at `https://github.com/tncreditsolutions/Website`

---

## Step 1: Create Fly.io Account

1. Go to [fly.io](https://fly.io)
2. Click **"Sign Up"**
3. Sign up with GitHub (easiest option)
4. Authorize Fly.io to access your GitHub account
5. Complete verification

---

## Step 2: Install Fly CLI

You'll need the Fly CLI tool on your computer:

**Mac:**
```bash
brew install flyctl
```

**Windows/Linux:**
Download from [fly.io/docs/hands-on/install-flyctl](https://fly.io/docs/hands-on/install-flyctl/)

Verify installation:
```bash
flyctl version
```

---

## Step 3: Login to Fly

From your terminal:
```bash
flyctl auth login
```

This opens a browser to authenticate. Follow the steps and return to terminal when done.

---

## Step 4: Clone Your Repository Locally

If you haven't already:
```bash
git clone https://github.com/tncreditsolutions/Website
cd Website
```

---

## Step 5: Create Fly App

From your project directory, run:
```bash
flyctl launch
```

This interactive command will ask:

| Prompt | Answer |
|--------|--------|
| App name | `tn-credit-solutions` (or your preferred name) |
| Choose region | Pick closest to you (e.g., `ewr` for US East) |
| Would you like to set up a PostgreSQL database now? | **Yes** |
| PostgreSQL Configuration | Select `development` (free tier) |
| Scale PostgreSQL to zero after 1 hour? | **Yes** (to save resources) |
| Would you like to add WSL SQLite local volume? | **No** |

After completion, two files are created:
- `fly.toml` - Fly configuration
- `Dockerfile` - Docker build instructions (auto-generated)

---

## Step 6: Set Environment Variables

```bash
flyctl secrets set NODE_ENV=production
flyctl secrets set SESSION_SECRET=bf7414a8280df2771625d50f5375aaf56a9d6f553ac775a6ff2483eec8ae95b1
flyctl secrets set PORT=8080
```

Note: Fly uses port 8080 by default, not 5000.

---

## Step 7: Update fly.toml Configuration

Edit the `fly.toml` file created in your project root. Find the `[build]` section and update it:

```toml
[build]
  builder = "heroku"
```

This tells Fly to use Node.js buildpack. Your fly.toml should look like:

```toml
app = "tn-credit-solutions"
primary_region = "ewr"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[build]
  builder = "heroku"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
```

---

## Step 8: Deploy to Fly

From your project directory:
```bash
flyctl deploy
```

Fly will:
1. Build your app
2. Deploy to machines
3. Set up PostgreSQL database
4. Start your app

Wait for completion (2-5 minutes). You'll see your app URL at the end.

---

## Step 9: Get Database Connection String

```bash
flyctl postgres connect -a tn-credit-solutions-db
```

This connects to your PostgreSQL database. Inside postgres, run:
```sql
\conninfo
```

Copy the connection string (something like `postgresql://user:password@host/database`)

---

## Step 10: Set DATABASE_URL

```bash
flyctl secrets set DATABASE_URL="<paste-your-connection-string>"
```

---

## Step 11: Deploy Again to Apply Database URL

```bash
flyctl deploy
```

---

## Step 12: Initialize Database Tables

```bash
# SSH into your Fly machine
flyctl ssh console

# Inside the machine, run:
npm run db:push

# Exit
exit
```

---

## Step 13: Verify Your Deployment

1. Get your app URL:
   ```bash
   flyctl info
   ```

2. Visit the URL (should be `https://tn-credit-solutions.fly.dev`)

3. Test:
   - Homepage loads
   - Fill out contact form
   - Visit /admin to see submissions
   - Visit /privacy, /terms, /disclaimer
   - Check live chat widget

---

## Success! Your App is Live ✅

Your website is now running on Fly.io with:
- ✅ Node.js backend
- ✅ React frontend
- ✅ PostgreSQL database (free tier)
- ✅ Live chat widget
- ✅ Contact form with lead tracking
- ✅ Admin dashboard
- ✅ Free tier (3 shared-cpu-1x 256MB machines)

---

## Key Commands

```bash
# View logs
flyctl logs

# SSH into machine
flyctl ssh console

# Check app status
flyctl status

# View environment variables
flyctl secrets list

# Restart app
flyctl restart

# Check database status
flyctl postgres status
```

---

## Free Tier Details

Fly.io free tier includes:
- 3 shared-cpu-1x 256MB machines (always free)
- 3 PostgreSQL databases (3GB each)
- 160GB outbound data transfer per month
- No credit card required

Your app will auto-scale down to save resources when not in use.

---

## Optional: Custom Domain

1. Go to your DNS registrar
2. Add CNAME record pointing to `tn-credit-solutions.fly.dev`
3. Run:
   ```bash
   flyctl certs add yourdomain.com
   ```

---

## Troubleshooting

### Deploy Fails
```bash
# View detailed logs
flyctl logs

# Check machine status
flyctl machines list
```

### Database Connection Error
```bash
# Check database is running
flyctl postgres status

# View database connection info
flyctl postgres connect -a tn-credit-solutions-db
```

### Contact Form Not Saving
```bash
# SSH and check database
flyctl ssh console
npm run db:push
exit
```

### App Slow/Timing Out
- Free tier may be slow if idle
- First request after idle can take 30+ seconds
- Upgrade to paid for consistent performance

---

## Key URLs After Deployment

| Page | URL |
|------|-----|
| Home | `https://tn-credit-solutions.fly.dev` |
| Admin Dashboard | `https://tn-credit-solutions.fly.dev/admin` |
| Privacy Policy | `https://tn-credit-solutions.fly.dev/privacy` |
| Terms of Service | `https://tn-credit-solutions.fly.dev/terms` |
| Disclaimer | `https://tn-credit-solutions.fly.dev/disclaimer` |

---

## Support & Resources

- Fly.io Docs: [fly.io/docs](https://fly.io/docs)
- Fly.io Community: [Community Forum](https://community.fly.io)
- Your deployed website contact form
- Live chat widget on your site

**Your TN Credit Solutions website is now live on Fly.io! 🚀**

# AWS Free Tier Deployment - TN Credit Solutions

Deploy your Node.js app on AWS free tier for 12 months completely free. After that, costs are minimal (~$5-10/month for a small business site).

## Prerequisites
- GitHub account (already have this)
- AWS account (create at [aws.amazon.com](https://aws.amazon.com/free))
- Your code on GitHub: `https://github.com/tncreditsolutions/Website`
- Credit card for AWS verification (won't charge if you stay in free tier)

---

## Free Tier Includes (12 months)

- **EC2**: 1 t2.micro instance (your Node.js server)
- **RDS**: 1 db.t2.micro PostgreSQL database (20GB storage)
- **Data transfer**: 1GB/month
- **Elastic IP**: 1 static IP address
- **Total cost for 12 months**: **$0**

---

## Phase 1: Create AWS Account

### Step 1: Sign Up
1. Go to [aws.amazon.com/free](https://aws.amazon.com/free)
2. Click **"Create a Free Account"**
3. Enter email and create password
4. Choose **"Personal"** account type
5. Add your credit card (for verification only)
6. Verify via phone
7. Choose **"Basic"** support plan

Takes about 10-15 minutes. You'll get a welcome email.

### Step 2: Create IAM User (Best Practice)

1. Log into AWS Console
2. Search for **"IAM"** at the top
3. Click **"Users"** → **"Create User"**
4. User name: `website-admin`
5. Check: **"Provide user access to AWS Management Console"**
6. Click **"Next"**
7. Click **"Create user"** (no permissions needed yet)

---

## Phase 2: Set Up RDS PostgreSQL Database

### Step 3: Create RDS Database

1. Search for **"RDS"** in AWS Console
2. Click **"Create Database"**
3. Choose:
   - **Engine**: PostgreSQL
   - **Version**: Latest
   - **Templates**: **Free Tier** (important!)
   - **DB name**: `tn-credit-solutions` or `website`
   - **Username**: `postgres`
   - **Password**: Create a strong password (save it!)
   - **Publicly accessible**: **Yes**
   - Click **"Create Database"**

Wait 5-10 minutes for creation.

### Step 4: Get Database Connection String

1. In RDS, click your database
2. Find **"Endpoint"** (something like `tn-credit-solutions.xxxxxx.us-east-1.rds.amazonaws.com`)
3. Create connection string:
   ```
   postgresql://postgres:YOUR_PASSWORD@ENDPOINT:5432/tn-credit-solutions
   ```

Save this - you'll need it for deployment.

---

## Phase 3: Set Up EC2 Instance (Your Server)

### Step 5: Launch EC2 Instance

1. Search for **"EC2"** in AWS Console
2. Click **"Launch Instance"**
3. Choose:
   - **Name**: `tn-credit-solutions-server`
   - **OS Image**: Ubuntu 22.04 LTS (free tier eligible)
   - **Instance type**: `t2.micro` (free tier!)
   - **Key pair**: Create new:
     - Name: `tn-credit-solutions-key`
     - Type: RSA
     - Format: .pem
     - Download it (save to your computer!)
   - Click **"Review and Launch"**
4. On Review page:
   - **Security Group**: Create new
   - Add rules:
     - Type: HTTP, Port: 80, Source: Anywhere (0.0.0.0/0)
     - Type: HTTPS, Port: 443, Source: Anywhere (0.0.0.0/0)
     - Type: SSH, Port: 22, Source: My IP
   - Click **"Launch Instance"**

Instance starts up (~1 minute).

### Step 6: Allocate Elastic IP

1. In EC2, click **"Elastic IPs"** (left sidebar)
2. Click **"Allocate Elastic IP address"**
3. Click **"Allocate"**
4. Select the IP
5. Click **"Associate"** → select your instance
6. Click **"Associate"**

Now your server has a permanent IP address!

---

## Phase 4: Deploy Your App

### Step 7: Connect to Your Server

1. Open terminal on your computer
2. Navigate to where you downloaded the key file
3. Change permissions:
   ```bash
   chmod 400 tn-credit-solutions-key.pem
   ```
4. SSH into your server:
   ```bash
   ssh -i tn-credit-solutions-key.pem ubuntu@YOUR_ELASTIC_IP
   ```

You're now connected to your server!

### Step 8: Install Node.js on Server

Inside the SSH connection:

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

### Step 9: Clone Your Repository

```bash
# Clone your repo
git clone https://github.com/tncreditsolutions/Website
cd Website

# Create .env file
nano .env
```

Paste this (update DATABASE_URL with your actual connection string):

```
NODE_ENV=production
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_ENDPOINT:5432/tn-credit-solutions
SESSION_SECRET=bf7414a8280df2771625d50f5375aaf56a9d6f553ac775a6ff2483eec8ae95b1
PORT=3000
```

Press `Ctrl+O`, Enter, `Ctrl+X` to save.

### Step 10: Build and Deploy

```bash
# Install dependencies
npm install

# Build frontend
npm run build

# Push database schema
npm run db:push

# Start server
npm start
```

Your app should now be running!

### Step 11: Install PM2 (Keep App Running)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start app with PM2
pm2 start npm --name "tn-credit-solutions" -- start

# Make it auto-start on reboot
pm2 startup
pm2 save

# Check status
pm2 status
```

---

## Phase 5: Make It Accessible

### Step 12: Install Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 13: Configure Nginx

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/tn-credit-solutions
```

Paste:
```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable it:
```bash
sudo ln -s /etc/nginx/sites-available/tn-credit-solutions /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Phase 6: Add SSL (HTTPS)

### Step 14: Install Certbot for Free SSL

```bash
sudo apt install -y certbot python3-certbot-nginx

# Get your Elastic IP
# Then run:
sudo certbot certonly --nginx --non-interactive --agree-tos -m your-email@example.com -d YOUR_ELASTIC_IP
```

---

## Phase 7: Test Your Deployment

1. Get your Elastic IP from AWS EC2 console
2. Visit: `http://YOUR_ELASTIC_IP`
3. Your site should be live!

Test:
- ✅ Homepage loads
- ✅ Contact form submits
- ✅ /admin page works
- ✅ Legal pages load

---

## Optional: Connect Custom Domain

1. In AWS Route 53, create hosted zone for your domain
2. Update your domain registrar's nameservers to AWS nameservers
3. Create A record pointing to your Elastic IP
4. Update Nginx config with domain name
5. Re-run Certbot with domain

---

## Useful Commands After Deployment

```bash
# SSH into server
ssh -i tn-credit-solutions-key.pem ubuntu@YOUR_ELASTIC_IP

# View app logs
pm2 logs tn-credit-solutions

# Restart app
pm2 restart tn-credit-solutions

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Update code from GitHub
cd ~/Website
git pull origin main
npm run build
pm2 restart tn-credit-solutions
```

---

## Troubleshooting

### App Won't Start
```bash
# Check PM2 logs
pm2 logs

# Check Node process
ps aux | grep node

# Check database connection
psql $DATABASE_URL
```

### Can't Connect to Server
- Verify security group allows SSH (port 22)
- Make sure .pem file has correct permissions: `chmod 400 key.pem`
- Verify you're using correct Elastic IP

### Database Connection Error
- Check RDS security group allows inbound on port 5432
- Verify DATABASE_URL in .env is correct
- Test connection: `psql postgresql://postgres:pass@endpoint:5432/db`

### Site Not Loading
- Check Nginx running: `sudo systemctl status nginx`
- Check Nginx config: `sudo nginx -t`
- Check app running: `pm2 status`
- Check logs: `pm2 logs`

---

## After 12 Months (When Free Tier Expires)

Options:
1. **Keep using AWS** - costs ~$5-10/month for a small site
2. **Move to Railway** - ~$20/month (simpler)
3. **Move to another platform**
4. **Keep free tier resources running** - AWS sometimes extends free tier

---

## AWS Console Shortcuts

| Task | Search For |
|------|-----------|
| EC2 Instances | "EC2" |
| Databases | "RDS" |
| Users | "IAM" |
| Domains | "Route 53" |
| DNS | "Route 53" |

---

## Key Information to Save

```
Elastic IP: [YOUR_IP]
Database Endpoint: [YOUR_ENDPOINT]
Database Password: [YOUR_PASSWORD]
SSH Key: tn-credit-solutions-key.pem (on your computer)
GitHub Repo: https://github.com/tncreditsolutions/Website
```

---

## Summary

1. ✅ Create AWS account
2. ✅ Create RDS PostgreSQL database
3. ✅ Launch EC2 t2.micro instance
4. ✅ Allocate Elastic IP
5. ✅ SSH into server
6. ✅ Install Node.js
7. ✅ Clone repo, deploy app
8. ✅ Use PM2 to keep app running
9. ✅ Install Nginx reverse proxy
10. ✅ Add SSL with Certbot

**Your TN Credit Solutions site is now live on AWS for FREE! 🚀**

---

## Support

- AWS Free Tier FAQ: [aws.amazon.com/free/faq](https://aws.amazon.com/free/faq)
- AWS EC2 Docs: [docs.aws.amazon.com/ec2](https://docs.aws.amazon.com/ec2)
- Nginx Docs: [nginx.org](https://nginx.org)
- Contact form on your deployed site

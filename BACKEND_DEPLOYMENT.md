# Backend Deployment Guide

## Overview
This guide explains how to deploy the LifeOS backend to various platforms for production use.

---

## Local Development Setup

### Quick Start (5 minutes)

1. **Install MongoDB**
   ```bash
   # macOS (Homebrew)
   brew tap mongodb/brew
   brew install mongodb-community
   brew services start mongodb-community

   # Windows (WSL)
   sudo apt-get install -y mongodb
   mongod

   # Or use MongoDB Atlas (cloud)
   ```

2. **Configure Environment**
   ```bash
   # Create .env in backend/ folder
   PORT=4000
   MONGODB_URI=mongodb://127.0.0.1:27017/lifeos
   NODE_ENV=development
   ```

3. **Start Development**
   ```bash
   # From project root
   npm run dev:all

   # Or just backend
   npm run server
   ```

4. **Verify**
   ```bash
   curl http://localhost:4000/api/health
   # Response: { "status": "ok" }
   ```

---

## Deploying to Cloud Platforms

### Option 1: Heroku (Easiest)

#### Prerequisites
- Heroku account (free tier available)
- Git installed
- Heroku CLI installed

#### Steps

1. **Create Heroku app**
   ```bash
   heroku login
   heroku create lifeos-backend
   ```

2. **Add MongoDB Atlas**
   - Sign up at https://www.mongodb.com/cloud/atlas
   - Create free cluster
   - Get connection string
   ```bash
   heroku config:set MONGODB_URI=mongodb://user:pass@cluster.mongodb.net/lifeos
   ```

3. **Add backend Procfile**
   Create `backend/Procfile`:
   ```
   web: node server.js
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

5. **Verify**
   ```bash
   heroku logs --tail
   heroku open
   ```

---

### Option 2: AWS (EC2 + RDS)

#### Prerequisites
- AWS account
- AWS CLI configured

#### Steps

1. **Create EC2 Instance**
   - Select Ubuntu 22.04 LTS
   - SSH into instance
   
2. **Setup Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   node --version  # Verify
   ```

3. **Clone Repository**
   ```bash
   git clone <your-repo-url>
   cd lifeos-app
   npm install
   ```

4. **Setup MongoDB Atlas**
   - Create cluster on MongoDB Atlas
   - Get connection string
   - Update .env with MONGODB_URI

5. **Start Application**
   ```bash
   npm run server
   ```

6. **Setup PM2 (Process Manager)**
   ```bash
   npm install -g pm2
   pm2 start backend/server.js --name "lifeos-backend"
   pm2 startup
   pm2 save
   ```

7. **Setup Nginx Reverse Proxy**
   ```bash
   sudo apt-get install -y nginx
   sudo nano /etc/nginx/sites-available/default
   ```
   
   Config:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:4000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

8. **Enable SSL**
   ```bash
   sudo apt-get install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

---

### Option 3: Google Cloud Run (Containerized)

#### Prerequisites
- Google Cloud account
- Docker installed
- gcloud CLI

#### Steps

1. **Create Dockerfile** in `backend/`
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package.json package-lock.json ./
   RUN npm install
   COPY . .
   EXPOSE 4000
   CMD ["node", "server.js"]
   ```

2. **Build & Push**
   ```bash
   gcloud auth login
   gcloud config set project PROJECT_ID
   gcloud builds submit --tag gcr.io/PROJECT_ID/lifeos-backend
   ```

3. **Deploy**
   ```bash
   gcloud run deploy lifeos-backend \
     --image gcr.io/PROJECT_ID/lifeos-backend \
     --platform managed \
     --region us-central1 \
     --set-env-vars MONGODB_URI=<connection-string>
   ```

---

### Option 4: DigitalOcean (Simple & Affordable)

#### Prerequisites
- DigitalOcean account
- Droplet created (Ubuntu 22.04, $5/month)

#### Steps

1. **SSH into Droplet**
   ```bash
   ssh root@droplet_ip
   ```

2. **Setup Node.js**
   ```bash
   curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs git
   ```

3. **Clone Repository**
   ```bash
   git clone <your-repo-url>
   cd lifeos-app
   npm install
   ```

4. **Create .env**
   ```bash
   cat > backend/.env << EOF
   PORT=4000
   MONGODB_URI=<your-mongodb-uri>
   NODE_ENV=production
   EOF
   ```

5. **Setup with Supervisor**
   ```bash
   sudo apt-get install -y supervisor
   sudo nano /etc/supervisor/conf.d/lifeos.conf
   ```
   
   Add:
   ```ini
   [program:lifeos-backend]
   directory=/root/lifeos-app
   command=/usr/bin/node backend/server.js
   autostart=true
   autorestart=true
   user=www-data
   ```

   ```bash
   sudo supervisorctl reread
   sudo supervisorctl update
   sudo supervisorctl start lifeos-backend
   ```

6. **Setup Nginx**
   ```bash
   sudo apt-get install -y nginx
   sudo nano /etc/nginx/sites-available/lifeos
   ```
   
   Add reverse proxy config (same as AWS section)

---

## Environment Variables

### Development
```
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/lifeos
NODE_ENV=development
```

### Production
```
PORT=4000
MONGODB_URI=mongodb://user:password@cluster.mongodb.net/lifeos?retryWrites=true&w=majority
NODE_ENV=production
```

---

## Database Backup & Recovery

### Backup MongoDB
```bash
# Local backup
mongodump --db lifeos --out ./backup

# MongoDB Atlas automatic backups
# Check Atlas dashboard > Backup
```

### Restore from Backup
```bash
mongorestore --db lifeos ./backup/lifeos
```

---

## Monitoring & Logging

### Check Application Status
```bash
# Heroku
heroku logs --tail

# PM2
pm2 logs lifeos-backend

# Systemd
journalctl -u lifeos -f
```

### Monitor Performance
```bash
# Check server uptime
curl http://localhost:4000/api/health

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:4000/api/tasks
```

---

## Scaling Considerations

### Load Balancing
- Use load balancer (AWS ELB, Nginx) for multiple instances
- Deploy app on multiple servers
- Share MongoDB between instances

### Database Optimization
- Add indexes on frequently queried fields
- Use MongoDB Atlas auto-scaling
- Monitor query performance

### Caching
- Add Redis for session caching
- Cache frequently accessed columns
- Reduce database queries

---

## Troubleshooting

### Application Won't Start
```bash
# Check logs
heroku logs --tail
npm run server  # Try locally first

# Check environment variables
heroku config
printenv
```

### MongoDB Connection Error
- Verify MONGODB_URI in .env
- Check MongoDB is running
- Test connection: `mongo <URI>`
- Whitelist IP in MongoDB Atlas

### High Memory Usage
- Check for memory leaks: `node --inspect server.js`
- Use PM2 monitoring: `pm2 monit`
- Restart periodically: `pm2 restart all --cron "0 2 * * *"`

### Slow API Responses
- Add MongoDB indexes
- Profile queries with MongoDB Compass
- Consider caching layer
- Scale horizontally with load balancer

---

## Continuous Deployment (CI/CD)

### GitHub Actions Example
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Heroku

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
          heroku_app_name: "lifeos-backend"
          heroku_email: ${{ secrets.HEROKU_EMAIL }}
```

---

## Cost Comparison

| Platform | Cost | Features |
|----------|------|----------|
| **Heroku** | $7-50/month | Simple, auto-scaling, built-in CI/CD |
| **AWS EC2** | $5-20/month | More control, complex setup |
| **DigitalOcean** | $5-12/month | Simple, affordable, good support |
| **Google Cloud Run** | Pay-per-use | Serverless, auto-scaling |
| **MongoDB Atlas** | Free-500/month | Managed database, automatic backups |

---

## Post-Deployment Checklist

- [ ] Environment variables configured
- [ ] MongoDB connection tested
- [ ] API health check responds
- [ ] CORS configured for frontend domain
- [ ] SSL certificate installed (HTTPS)
- [ ] Monitoring alerts set up
- [ ] Backup strategy implemented
- [ ] Logging configured
- [ ] Domain DNS updated
- [ ] Frontend configured to use production API URL

---

## Support & Resources

- **Express.js**: https://expressjs.com/
- **MongoDB**: https://docs.mongodb.com/
- **Mongoose**: https://mongoosejs.com/
- **Heroku**: https://devcenter.heroku.com/
- **Node.js**: https://nodejs.org/docs/

---

**Last Updated**: March 19, 2026

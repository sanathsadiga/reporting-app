# Deployment Guide for Hostinger VPS

## Prerequisites

- Hostinger VPS with Ubuntu 22.04+
- Domain with A-record pointing to VPS IP
- SSH access to VPS

## 1. DNS Setup

Add an A-record in your DNS settings:
```
Type: A
Name: reports (or your subdomain)
Value: YOUR_VPS_IP
TTL: 3600
```

## 2. Server Initial Setup

```bash
# Connect to your VPS
ssh root@YOUR_VPS_IP

# Update system
apt update && apt upgrade -y

# Create non-root user (optional but recommended)
adduser appuser
usermod -aG sudo appuser

# Setup firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## 3. Install Required Software

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Verify installation
node --version
npm --version

# Install MySQL 8
apt install -y mysql-server
mysql_secure_installation

# Install Nginx
apt install -y nginx

# Install Certbot for SSL
apt install -y certbot python3-certbot-nginx

# Install PM2 globally
npm install -g pm2
```

## 4. Configure MySQL

```bash
# Login to MySQL
mysql -u root -p

# Create database and user
CREATE DATABASE reporting_app;
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON reporting_app.* TO 'appuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 5. Deploy Backend

```bash
# Create app directory
mkdir -p /var/www/reporting-backend
cd /var/www/reporting-backend

# Clone or upload your backend code
# Option 1: Git
git clone YOUR_REPO_URL .

# Option 2: SCP from local
# scp -r ./backend/* root@YOUR_VPS_IP:/var/www/reporting-backend/

# Install dependencies
npm install --production

# Create .env file
cat > .env << EOF
PORT=5001
NODE_ENV=production

DB_HOST=localhost
DB_PORT=3306
DB_USER=appuser
DB_PASSWORD=YOUR_STRONG_PASSWORD
DB_NAME=reporting_app

JWT_ACCESS_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CEO_EMAIL=ceo@timesgroup.com
FRONTEND_URL=https://reports.yourdomain.com
EOF

# Run migrations and seed
npm run migrate
npm run seed

# Start with PM2
pm2 start src/index.js --name reporting-backend
pm2 save
pm2 startup
```

## 6. Deploy Frontend

```bash
# On your local machine, build the frontend
cd frontend
npm run build

# Upload build to VPS
scp -r ./dist/* root@YOUR_VPS_IP:/var/www/reports-frontend/

# Or on the VPS, clone and build
mkdir -p /var/www/reports-frontend
cd /var/www/reports-frontend
# Upload source and build
npm install
npm run build
mv dist/* .
rm -rf node_modules src package*.json
```

## 7. Configure Nginx

```bash
# Create Nginx configuration
cat > /etc/nginx/sites-available/reports << 'EOF'
server {
    listen 80;
    server_name reports.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name reports.yourdomain.com;

    # SSL will be configured by Certbot

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:5001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend static files
    location / {
        root /var/www/reports-frontend;
        index index.html;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/reports /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

## 8. Configure SSL with Certbot

```bash
certbot --nginx -d reports.yourdomain.com

# Auto-renewal is configured automatically
# Test auto-renewal
certbot renew --dry-run
```

## 9. Security Hardening

### SSH Configuration
```bash
# Edit SSH config
nano /etc/ssh/sshd_config

# Set these values:
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes

# Restart SSH
systemctl restart sshd
```

### Install Fail2ban
```bash
apt install -y fail2ban

cat > /etc/fail2ban/jail.local << EOF
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
EOF

systemctl enable fail2ban
systemctl start fail2ban
```

### MySQL Backups
```bash
# Create backup script
cat > /root/backup-mysql.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mysqldump -u appuser -pYOUR_PASSWORD reporting_app | gzip > $BACKUP_DIR/reporting_app_$DATE.sql.gz
# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete
EOF

chmod +x /root/backup-mysql.sh

# Add to cron (daily at 2 AM)
echo "0 2 * * * /root/backup-mysql.sh" | crontab -
```

## 10. Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs reporting-backend

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 11. Updates

### Backend Update
```bash
cd /var/www/reporting-backend
git pull
npm install --production
pm2 restart reporting-backend
```

### Frontend Update
```bash
# Build locally and upload
scp -r ./dist/* root@YOUR_VPS_IP:/var/www/reports-frontend/
```

## Troubleshooting

### Check service status
```bash
systemctl status nginx
systemctl status mysql
pm2 status
```

### Common issues
1. **502 Bad Gateway**: Backend not running, check `pm2 logs`
2. **Connection refused**: Firewall blocking, check `ufw status`
3. **SSL issues**: Run `certbot renew`
4. **MySQL connection failed**: Check credentials in `.env`

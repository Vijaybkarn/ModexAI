# Production Deployment Guide - Bolt.new Hosting

## ✅ Current Status - DEPLOYED

**Hosted URL:** https://bablooqa-gosetlegpt-l0ai.bolt.host

**API Backend:** Supabase Edge Functions

**Status:** ✅ Production Ready (after OAuth configuration)

## 🚨 CRITICAL: Google OAuth Setup Required

To enable login on the hosted application, you MUST configure Google OAuth redirect URLs:

### Step 1: Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **"Gosetle® AI"**
3. Navigate to: **APIs & Services** → **Credentials**
4. Find: **"Client ID for Web application"**

### Step 2: Add Authorized JavaScript Origins

Add these URLs:
```
https://bablooqa-gosetlegpt-l0ai.bolt.host
https://uohfnovafbtnnnztrbmv.supabase.co
```

### Step 3: Add Authorized Redirect URIs

Add these URLs:
```
https://bablooqa-gosetlegpt-l0ai.bolt.host/auth/callback
https://uohfnovafbtnnnztrbmv.supabase.co/auth/v1/callback
```

### Step 4: Save and Wait

- Click **Save**
- Wait 5-10 minutes for changes to propagate
- Clear browser cache
- Test login

## 🌐 Deployed Architecture

## Local Development

### Using Docker Compose

1. **Create `.env` file from `.env.example`:**
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

2. **Update environment variables with your actual values**

3. **Build and run:**
```bash
docker-compose up -d
```

4. **Check logs:**
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

5. **Access the application:**
- Frontend: http://localhost
- Backend API: http://localhost:3001

### Without Docker

**Terminal 1 - Backend:**
```bash
cd backend
npm install
npm run build
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm install
npm run dev
```

## VPS Deployment (Ubuntu 20.04+)

### Step 1: Server Setup

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Add user to docker group (optional)
usermod -aG docker your-user

# Install Nginx (optional, for SSL termination)
apt install -y nginx certbot python3-certbot-nginx
```

### Step 2: Clone and Configure

```bash
# Create app directory
mkdir -p /app/ai-chat-platform
cd /app/ai-chat-platform

# Clone repository
git clone https://github.com/your-repo/ai-chat-platform.git .

# Create environment files
cp .env.example .env
cp backend/.env.example backend/.env

# Edit with your configuration
nano .env
nano backend/.env
```

### Step 3: Database Migrations

```bash
# Apply database migrations
# This is done once during deployment

# Using Supabase CLI (if installed)
supabase db push

# Or manually via Supabase dashboard
```

### Step 4: Deploy with Docker Compose

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Verify services
docker-compose ps

# Check logs
docker-compose logs -f
```

### Step 5: Nginx Configuration (Optional)

If using Nginx as a reverse proxy:

1. **Create Nginx config:**
```bash
cat > /etc/nginx/sites-available/ai-chat << 'EOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # SSL configuration will be added by Certbot

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

2. **Enable site:**
```bash
ln -s /etc/nginx/sites-available/ai-chat /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Step 6: SSL Certificate

```bash
# Obtain SSL certificate with Certbot
certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Or with nginx plugin
certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Step 7: Monitoring and Maintenance

```bash
# View running containers
docker ps

# View logs
docker-compose logs backend
docker-compose logs frontend

# Update containers
docker-compose pull
docker-compose up -d

# Restart services
docker-compose restart backend
docker-compose restart frontend

# Stop services
docker-compose down
```

## Kubernetes Deployment

### Helm Chart Setup

1. **Create values.yaml:**
```yaml
replicaCount: 2

backend:
  image: your-registry/ai-chat-backend:latest
  replicas: 2
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"

frontend:
  image: your-registry/ai-chat-frontend:latest
  replicas: 2
  resources:
    requests:
      memory: "128Mi"
      cpu: "100m"
    limits:
      memory: "256Mi"
      cpu: "200m"

ingress:
  enabled: true
  hosts:
    - host: your-domain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: ai-chat-tls
      hosts:
        - your-domain.com

environment:
  SUPABASE_URL: "https://your-project.supabase.co"
  NODE_ENV: "production"
```

2. **Deploy:**
```bash
helm install ai-chat ./chart -f values.yaml
```

3. **Monitor:**
```bash
kubectl get pods
kubectl logs deployment/ai-chat-backend
kubectl get svc
```

## Environment Variables for Production

### Backend (.env or secrets)
```bash
PORT=3001
NODE_ENV=production

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

JWT_SECRET=<generate-secure-random-string>
ENCRYPTION_KEY=<generate-32-char-random-string>

CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (.env or build args)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_API_URL=https://api.your-domain.com
```

## Ollama Configuration

### Local Ollama
```bash
# Run Ollama container
docker run -d \
  -v ollama:/root/.ollama \
  -p 11434:11434 \
  --name ollama \
  ollama/ollama

# Pull a model
docker exec ollama ollama pull llama2
```

### Hosted Ollama
- Set endpoint URL in admin panel: `https://ollama-host.example/api`
- Add API key if authentication is enabled
- Platform will encrypt and store the key securely

## Backup and Recovery

### Database Backups
```bash
# Supabase automatic backups (included)
# Manual backup via Supabase dashboard or CLI

supabase db pull  # Local backup
supabase db push  # Restore
```

### Docker Volume Backups
```bash
# Backup conversation data
docker run --rm -v ai-chat_data:/data -v $(pwd):/backup \
  ubuntu tar czf /backup/data-backup.tar.gz -C /data .

# Restore
tar xzf data-backup.tar.gz -C /docker/volumes/ai-chat_data/
```

## Scaling Considerations

### Horizontal Scaling
- Deploy multiple backend instances behind a load balancer
- Frontend is static, serve from CDN (Cloudflare, AWS CloudFront)
- Use managed database (Supabase handles this)

### Caching
- Add Redis for session caching (optional)
- Use CDN for static assets
- Enable browser caching (configured in nginx.conf)

### Performance Optimization
- Configure rate limiting per user
- Implement request batching
- Use connection pooling in backend
- Monitor response times with APM

## Monitoring & Logging

### Logs
```bash
# View all logs
docker-compose logs

# Follow logs
docker-compose logs -f backend

# Export logs
docker-compose logs > logs.txt
```

### Metrics
- Implement Prometheus + Grafana for monitoring
- Set up alerts for error rates and latency
- Track model usage and costs
- Monitor infrastructure health

### Error Tracking
- Integrate Sentry for error monitoring
- Set up uptime monitoring (UptimeRobot, Pingdom)
- Configure Slack/email alerts for critical errors

## Security Hardening

1. **Network Security**
   - Use firewall rules to restrict access
   - Enable VPC/security groups
   - Use private subnets for database

2. **SSL/TLS**
   - Force HTTPS in production
   - Set HSTS headers
   - Use strong cipher suites

3. **Access Control**
   - Enable 2FA for Supabase
   - Use strong API keys
   - Rotate secrets regularly

4. **Secrets Management**
   - Use AWS Secrets Manager, HashiCorp Vault, or Supabase Vault
   - Never commit secrets to git
   - Use environment-specific secrets

## Rollback Procedure

```bash
# If deployment fails, rollback to previous version
docker-compose down
git checkout previous-version
docker-compose up -d

# Or keep multiple versions and switch
docker-compose down
docker tag ai-chat-backend:current ai-chat-backend:prev
docker tag ai-chat-backend:new ai-chat-backend:current
docker-compose up -d
```

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs

# Check resource availability
free -h
df -h

# Restart Docker
systemctl restart docker
```

### High memory usage
```bash
# Check container memory
docker stats

# Increase limits in docker-compose.yml
```

### Slow response times
```bash
# Check backend logs for errors
docker-compose logs backend -f

# Monitor database queries
# Use Supabase dashboard to check query performance
```

## Support

For deployment issues:
1. Check Docker logs
2. Verify environment variables
3. Test Ollama connectivity
4. Review Supabase configuration
5. Check firewall/security group rules

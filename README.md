# Manar App

Full-stack web application with CI/CD pipeline.

- **Frontend**: HTML/CSS/JS served via Nginx
- **Backend**: Node.js + Express + MongoDB
- **CI/CD**: Jenkins pipeline → Docker Hub → Auto deploy
- **Monitoring**: Shared with DevopsAcademy (Prometheus + Grafana)
- **Domain**: https://manar.cloud-stacks.com

## Server Setup Steps

### 1. DNS (Cloudflare)
- A record: `manar.cloud-stacks.com` → `20.25.62.124`
- Proxy status: DNS only (grey cloud) for SSL cert generation

### 2. Create deploy directory on server
```bash
sudo mkdir -p /home/maged/manar-app
sudo chown maged:maged /home/maged/manar-app
```

### 3. Install host-level Nginx (one-time, if not already installed)
```bash
sudo apt install nginx -y
sudo rm /etc/nginx/sites-enabled/default
```

### 4. SSL Certificates (Let's Encrypt)
```bash
# Stop any service on port 80 temporarily
sudo systemctl stop nginx

# Get cert for manar app
sudo certbot certonly --standalone -d manar.cloud-stacks.com

# Get cert for devopsacademy (if not already using certbot)
sudo certbot certonly --standalone -d devopsacademy.cloud-stacks.com

sudo systemctl start nginx
```

### 5. Configure Host Nginx
```bash
# Copy the configs from host-nginx/ folder
sudo cp host-nginx/devopsacademy.conf /etc/nginx/sites-available/devopsacademy
sudo cp host-nginx/manar-app.conf /etc/nginx/sites-available/manar-app

# Enable them
sudo ln -sf /etc/nginx/sites-available/devopsacademy /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/manar-app /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Update DevopsAcademy docker-compose
The DevopsAcademy `docker-compose.yml` ports have been changed from `80:80` / `443:443` to `127.0.0.1:8080:80`.
Redeploy DevopsAcademy:
```bash
cd /home/maged/devopsacademy
docker compose down
docker compose up -d
```

### 7. Create Jenkins Job for Manar App
1. Go to Jenkins → New Item → Pipeline
2. Name: `manar-app-pipeline`
3. Pipeline → Definition: Pipeline script from SCM
4. SCM: Git → URL: `https://github.com/Maged2344/manar-app.git`
5. Branch: `main`
6. Script Path: `Jenkinsfile`
7. Build Triggers: Poll SCM (`* * * * *`)
8. Credentials: use existing `dockerhub-credentials`

### 8. Push to GitHub
```bash
cd manar-app
git init
git add .
git commit -m "Initial commit - Manar App"
git remote add origin https://github.com/Maged2344/manar-app.git
git push -u origin main
```

### 9. Verify
- https://manar.cloud-stacks.com → should show Manar App
- https://devopsacademy.cloud-stacks.com → should still work
- Prometheus → Targets → `manar-app-backend` should appear

## Architecture
```
Internet
    │
    ▼
Host Nginx (port 80/443) ─── SSL termination
    │
    ├── devopsacademy.cloud-stacks.com → 127.0.0.1:8080 → devopsacademy-web container
    │
    └── manar.cloud-stacks.com → 127.0.0.1:8090 → manar-app-web container
                                                        │
                                                        ▼
                                                   manar-app-backend:3000
                                                        │
                                                        ▼
                                                   manar-app-mongo:27017
```

# Deployment Guide (Linux VPS)

This guide walks you through deploying Reva AI to a Linux VPS (Ubuntu/Debian) **without a domain name**. You will access the application directly via your server's IP address.

## Prerequisites

- A Linux VPS (Ubuntu 20.04 or 22.04 recommended).
- Root access (or a user with `sudo` privileges).
- Your VPS IP Address (e.g., `123.45.67.89`).

---

## Step 1: Prepare the Server

Connect to your VPS via SSH:

```bash
ssh root@your_vps_ip
```

Update packages and install essential tools:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install curl git build-essential -y
```

### Install Node.js (v18+)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### Install Process Manager (PM2)

PM2 keeps your backend running in the background.

```bash
sudo npm install -g pm2
```

---

## Step 2: Upload Your Project

You can upload your files using `scp` (from your local machine) or `git`.

### Option A: Using Git (Recommended)

1.  Push your code to GitHub/GitLab.
2.  Clone it on the server:
    ```bash
    cd /var/www
    sudo git clone https://github.com/your-username/reva-ai.git
    cd reva-ai
    ```

### Option B: Using SCP (If code is local only)

Run this **from your local machine** (PowerShell/Terminal):

```bash
# Zip your project first (exclude node_modules)
scp path/to/reva-ai.zip root@your_vps_ip:/var/www/
```

Then on the server:

```bash
cd /var/www
unzip reva-ai.zip
cd reva-ai
```

---

## Step 3: Backend Setup

Navigate to the server directory and install dependencies:

```bash
cd /var/www/reva-ai/server
npm install
```

### Configure Environment Variables

Create the `.env` file:

```bash
nano .env
```

Paste your configuration (ensure `PORT=3001`):

```env
PORT=3001
JWT_SECRET=your_super_secret_key_change_this
OPENAI_API_KEY=your_openai_api_key
DB_PATH=./reva.db
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

### Start Backend with PM2

```bash
pm2 start src/index.js --name "reva-server"
pm2 save
pm2 startup
```

---

## Step 4: Frontend Setup

Navigate to the client directory and build the project:

```bash
cd /var/www/reva-ai/client
npm install
```

### Update API URL for Production

Since we are using Nginx as a proxy, the frontend should point to the relative path `/api` instead of `localhost:3001`.
(The code changes I made to `History.jsx` and `vite.config.js` already support this!)

Build the static files:

```bash
npm run build
```

This creates a `dist` folder at `/var/www/reva-ai/client/dist`.

---

## Step 5: Nginx Configuration

Install Nginx to serve the frontend and proxy API requests.

```bash
sudo apt install nginx -y
```

Create a new configuration file:

```bash
sudo nano /etc/nginx/sites-available/reva-ai
```

Paste the following configuration (Replace `YOUR_VPS_IP` with your actual IP, e.g., `123.45.67.89`):

```nginx
server {
    listen 8080; # Using 8080 to avoid conflict with arvaya.id on port 80
    server_name YOUR_VPS_IP;  # <--- Put your IP here

    root /var/www/reva-ai/client/dist;
    index index.html;

    # Serve Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API Requests to Backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy Socket.IO (for Real-time updates)
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Serve Uploaded Images
    location /uploads/ {
        alias /var/www/reva-ai/server/uploads/;
    }
}
```

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/reva-ai /etc/nginx/sites-enabled/
# sudo rm /etc/nginx/sites-enabled/default  # DO NOT REMOVE default if you have other sites
sudo nginx -t                             # Check for errors
sudo systemctl restart nginx
```

---

## Step 6: Final Steps

### 1. Create Uploads Directory

Ensure the backend can write to the uploads folder:

```bash
mkdir -p /var/www/reva-ai/server/uploads
chmod 755 /var/www/reva-ai/server/uploads
```

### 2. Configure Firewall

Allow HTTP traffic on port 8080:

```bash
sudo ufw allow 8080/tcp
sudo ufw enable
```

### 3. Access Your App

Open your browser and visit: `http://YOUR_VPS_IP:8080`

You should see the login page!

---

## Troubleshooting

- **Backend Logs**: `pm2 logs reva-server`
- **Nginx Logs**: `sudo tail -f /var/log/nginx/error.log`
- **Database**: The SQLite file will be created in `server/src` or root depending on your path. Ensure the app has write permissions to that folder.


node create-user.js myuser mypassword
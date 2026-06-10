# RemoteDesk

Your Screen, Their Control. A browser-based remote desktop sharing application built with Next.js, WebRTC, and Socket.io.

## Important Note on Scope

> **Note**: Remote control functionality is limited to the **browser tab being shared**. It does not control the entire operating system. This is a strict limitation of the browser security model. Position this project as "browser tab sharing with remote control" rather than full desktop takeover. For full OS control, a desktop agent (e.g., using `robotjs`) would be required, which is out of scope for this web-only implementation.

## Features
- **Host Mode**: Share your screen (browser tab) directly from the browser.
- **Viewer Mode**: View the host's screen with sub-millisecond latency and control their mouse/keyboard.
- **Peer-to-Peer**: WebRTC streams video directly between peers. The signaling server handles only connections, ensuring privacy and speed.

## Project Structure
- `frontend/`: Next.js 14 app (Tailwind CSS, TypeScript).
- `backend/`: Node.js Express + Socket.io signaling server.

## Production Deployment

### 1. Backend on DigitalOcean
To deploy the signaling server on a DigitalOcean droplet (Ubuntu 22.04, 2GB RAM minimum):

```bash
# Update system and install dependencies
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx
npm install -g pm2

# Clone the repository
git clone your-repo
cd remotedesk/backend

# Install packages and build
npm install
npm run build

# Start with PM2
cd ..
pm2 start ecosystem.config.js
pm2 save && pm2 startup

# Setup Nginx and SSL (Ensure yourdomain.com points to your Droplet IP)
sudo certbot --nginx -d yourdomain.com
sudo systemctl restart nginx
```

### 2. Frontend on Vercel
1. Push your repository to GitHub.
2. Import the project in your Vercel Dashboard.
3. Configure the following Environment Variables in Vercel:
   - `NEXT_PUBLIC_SOCKET_URL` (e.g., `https://yourdomain.com` pointing to your droplet)
   - `NEXT_PUBLIC_TURN_URL`
   - `NEXT_PUBLIC_TURN_USERNAME`
   - `NEXT_PUBLIC_TURN_CREDENTIAL`
4. Deploy to get a free HTTPS URL.

### 3. TURN Server Configuration
WebRTC requires a TURN server for reliable connections across restrictive NATs/Firewalls.
1. Sign up at [metered.ca](https://www.metered.ca/) (Free tier available).
2. Get your credentials.
3. Add them to both your backend and frontend `.env` files.

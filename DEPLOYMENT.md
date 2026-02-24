# SkillSwap Deployment Guide

## Overview
This guide covers deploying SkillSwap to production using:
- **Frontend**: Vercel
- **Backend**: Railway
- **Database**: MongoDB Atlas (already configured)

---

## Pre-Deployment Checklist

- [ ] All code committed to Git
- [ ] Environment variables configured
- [ ] Database Atlas cluster created and accessible
- [ ] Backend and frontend tested locally

---

## Backend Deployment (Railway)

### Step 1: Prepare Backend for Production

1. **Create `runtime.txt`** in `/backend`:
```
python-3.11
```

2. **Update `requirements.txt`** to add production server:
```bash
cd backend
pip install gunicorn
pip freeze > requirements.txt
```

3. **Create `Procfile`** in `/backend`:
```
web: gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

4. **Update `backend/main.py`** CORS for production:
Change the `ALLOWED_ORIGINS` list to include your Vercel domain (you'll get this after frontend deployment):
```python
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://your-vercel-app.vercel.app",  # Add your Vercel domain
]
```

### Step 2: Create Railway Account & Deploy

1. **Sign up** at [railway.app](https://railway.app)
2. **Connect your GitHub repository** (if using Git)
3. **Create a new project** and select your repo
4. **Configure environment variables** in Railway dashboard:
   - `MONGO_URL`: Your full MongoDB Atlas connection URI
   - `SECRET_KEY`: A secure random string (generate: `python -c "import secrets; print(secrets.token_urlsafe(32))"`)
   - Any other env vars from your `.env`

5. **Deploy**: Railway auto-deploys on push to main
6. **Get your backend URL**: Railway will provide `https://your-backend.up.railway.app`

---

## Frontend Deployment (Vercel)

### Step 1: Update Frontend for Production

1. **Update `frontend/services/api.js`** to use production backend URL:
```javascript
// Change from localhost to Railway URL
const API_URL = "https://your-backend.up.railway.app";  // Replace with your Railway URL

// WebSocket URL (used in App.jsx)
// Change this line in App.jsx:
socket = new WebSocket(`wss://your-backend.up.railway.app/ws/${clientId}`);
// Note: Use wss:// for secure WebSocket over HTTPS
```

2. **Create `.env.production.local`** (if using local preview, otherwise skip):
```
VITE_API_URL=https://your-backend.up.railway.app
```

### Step 2: Create Railway Account & Deploy

1. **Sign up** at [vercel.com](https://vercel.com)
2. **Import your Git repository**
3. **Configure build settings**:
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `dist`
   - Root directory: `frontend`

4. **Deploy**: Vercel auto-deploys on push
5. **Get your frontend URL**: Vercel will provide `https://your-app.vercel.app`

---

## Post-Deployment Steps

### 1. Update Backend CORS (if not already done)
After getting your Vercel URL, update `backend/main.py`:
```python
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://your-app.vercel.app",
]
```
Commit and push — Railway will redeploy.

### 2. Update Frontend API URL (if not done)
Ensure `frontend/services/api.js` uses your Railway backend URL:
```javascript
const API_URL = "https://your-backend.up.railway.app";
```
Commit and push — Vercel will rebuild.

### 3. Update WebSocket URL in Frontend (App.jsx)
Change the WebSocket connection to use `wss://` (secure WebSocket):
```javascript
socket = new WebSocket(`wss://your-backend.up.railway.app/ws/${clientId}`);
```

### 4. Test the Live App
- Open your Vercel frontend URL
- Sign up and log in
- Test skill creation, requests, and notifications
- Check browser console for any errors

---

## Troubleshooting

### Backend Issues
- **Check Railway logs**: Dashboard → Your Project → Logs
- **Verify environment variables**: Ensure `MONGO_URL` and `SECRET_KEY` are set
- **Test API endpoint**: Visit `https://your-backend.up.railway.app/` — should see `{"message": "SkillSwap API is alive"}`

### Frontend Issues
- **Check Vercel logs**: Dashboard → Your Project → Deployments
- **Verify API URL**: Open DevTools → Network tab → check API calls go to correct backend
- **Check for CORS errors**: If API calls fail, backend CORS may not be updated

### HTTPS/WSS Issues
- WebSocket must use `wss://` (secure) when frontend is HTTPS
- If you see WebSocket connection errors, ensure backend URL uses `wss://`

---

## Environment Variables Summary

### Backend (Railway)
```
MONGO_USER=<your_atlas_user>
MONGO_PASS=<your_atlas_password>
MONGO_CLUSTER=<your_cluster_host>
SECRET_KEY=<generate_a_random_secure_string>
```

### Frontend (Vercel)
No special env vars needed — it will use the API URL in `services/api.js`

---

## Optional: Custom Domain

### For Railway Backend
1. Go to Railway dashboard → Project Settings
2. Add custom domain pointing to your Railway deployment

### For Vercel Frontend
1. Go to Vercel dashboard → Domains
2. Add your custom domain
3. Update DNS records as instructed

---

## Useful Commands

### Generate a secure SECRET_KEY
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Test backend locally before deploying
```bash
cd backend
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

### Build frontend for production
```bash
cd frontend
npm run build
npm run preview  # Preview the production build locally
```

---

## Support & Resources

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas**: https://www.mongodb.com/docs/atlas/
- **FastAPI Deployment**: https://fastapi.tiangolo.com/deployment/


# Pre-Deployment Checklist

## Quick Start

1. **Update API URLs** (after getting Railway backend URL):
   - [ ] Update `frontend/services/api.js` — change `API_URL` to your Railway backend URL
   - [ ] Update `frontend/src/App.jsx` — change WebSocket URL to use `wss://your-backend-url/ws/`
   - [ ] Update `backend/main.py` CORS — add your Vercel frontend URL to `ALLOWED_ORIGINS`

2. **Prepare Environment Variables**:
   - [ ] Generate a `SECRET_KEY` using: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
   - [ ] Ensure MongoDB Atlas connection info is ready

3. **Test Locally**:
   - [ ] Run backend: `cd backend && uvicorn main:app --reload`
   - [ ] Run frontend: `cd frontend && npm run dev`
   - [ ] Test signup → login → create skill → send request → check notifications

4. **Deploy Backend**:
   - [ ] Create Railway account
   - [ ] Connect GitHub repo to Railway
   - [ ] Set environment variables: `MONGO_URL` (or `MONGO_USER`, `MONGO_PASS`, `MONGO_CLUSTER`), `SECRET_KEY`
   - [ ] Get Railway backend URL

5. **Deploy Frontend**:
   - [ ] Create Vercel account
   - [ ] Import GitHub repo to Vercel
   - [ ] Set root directory to `frontend`
   - [ ] Get Vercel frontend URL

6. **Post-Deploy**:
   - [ ] Update backend CORS with Vercel URL
   - [ ] Verify API calls work (check browser DevTools → Network)
   - [ ] Test full flow: signup → skill → request → notifications

## Key Files for Deployment

- `backend/Procfile` — tells Railway how to run the app
- `backend/runtime.txt` — specifies Python version
- `backend/requirements.txt` — Python dependencies
- `vercel.json` — Vercel build config (frontend)
- `frontend/package.json` — Node dependencies
- `DEPLOYMENT.md` — Full deployment guide

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| CORS error on API calls | Update `ALLOWED_ORIGINS` in `backend/main.py` with your Vercel URL and redeploy |
| WebSocket connection fails | Change `ws://` to `wss://` in `App.jsx` and update to your Railway URL |
| "Cannot find module" errors | Ensure `npm install` was run in `frontend/` folder |
| Database connection fails | Verify `MONGO_URL` env var is set correctly in Railway dashboard |


# Deployment Guide

This project is deployed as:

- Frontend: Vercel (Vite static build)
- Backend: Render (Node web service)
- Database: MongoDB Atlas

## 1. MongoDB Atlas Setup

1. Create a free Atlas cluster.
2. Create a database user with read/write permissions.
3. In Network Access, allow Render egress:
- For hackathon speed, allow `0.0.0.0/0`.
- For tighter security, restrict to known IP ranges later.
4. Copy the connection string and replace placeholders:

```text
mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
```

## 2. Deploy Backend to Render

Two options are supported:

- Option A: Use `render.yaml` from repo root (recommended)
- Option B: Create service manually in Render UI

### Render service settings

- Name: `collab-editor-backend`
- Runtime: `Node`
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health`

### Required Render environment variables

- `NODE_ENV=production`
- `MONGODB_URI=<atlas connection string>`
- `JWT_SECRET=<strong-random-secret>`
- `JWT_EXPIRES_IN=7d`
- `CLIENT_ORIGIN=<your vercel frontend URL>`

Note: Render injects `PORT` automatically.

## 3. Deploy Frontend to Vercel

1. Import the repository in Vercel.
2. Configure project root as `frontend`.
3. Vercel picks `vercel.json` from `frontend/`.
4. Add environment variables:

- `VITE_API_URL=https://<render-backend>.onrender.com`
- `VITE_SOCKET_URL=https://<render-backend>.onrender.com`

5. Deploy and copy the generated Vercel URL.

## 4. Final CORS Wiring

Update Render backend environment variable:

- `CLIENT_ORIGIN=https://<your-vercel-domain>.vercel.app`

Redeploy backend after changing this value.

## 5. Post-Deployment Validation Checklist

1. Open two browser tabs on same document route:
- `https://<vercel-domain>/doc/demo-room`
2. Type in one tab and verify real-time sync in the other.
3. Confirm presence list updates on join/leave.
4. Wait 30+ seconds and confirm revisions appear.
5. Restore a revision and verify both tabs refresh into restored state.

## 6. Hackathon Demo Tips

1. Pre-create two room URLs:
- `/doc/pitch-demo`
- `/doc/judges-live`
2. Keep Render backend warm by opening `/health` a few minutes before demo.
3. Use different browser profiles to show true multi-user collaboration.

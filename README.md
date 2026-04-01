# Real-time Collaborative Text Editor

Hackathon project scaffold for a Google Docs-like collaborative editor using:

- Frontend: React + TipTap + Yjs
- Backend: Node.js + Express + Socket.IO
- Database: MongoDB Atlas

## Workspace Layout

```text
backend/    Express API, Socket.IO, Yjs sync, MongoDB persistence
frontend/   React app, TipTap editor, presence UI
docs/       Architecture, API notes, deployment notes
scripts/    Local development helper scripts
```

## Build Plan

- Step 1: Folder structure and baseline config
- Step 2: Backend setup with Express + Socket.IO + Yjs wiring
- Step 3: MongoDB models and revision schema
- Step 4: Frontend editor integration (TipTap + Yjs + cursors)
- Step 5: Presence indicators
- Step 6: Revision history and restore
- Step 7: UX polish and responsive layout
- Step 8: Deployment setup (Vercel + Render + Atlas)

## Local Run

1. Backend:

```bash
cd backend
npm install
npm run dev
```

2. Frontend:

```bash
cd frontend
npm install
npm run dev
```

3. Open `http://localhost:5173/doc/demo-room`.

## Deployment

- Backend deploy config: [render.yaml](render.yaml)
- Frontend deploy config: [frontend/vercel.json](frontend/vercel.json)
- Full guide: [docs/deployment.md](docs/deployment.md)

Required production variables:

- Backend (`Render`): `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_ORIGIN`
- Frontend (`Vercel`): `VITE_API_URL`, `VITE_SOCKET_URL`

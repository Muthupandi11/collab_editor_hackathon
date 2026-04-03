# CollabEditor - Real-time Collaborative Text Editor

CollabEditor is a Google Docs-like collaborative editor built for hackathon delivery.
It supports multi-user editing, presence, revision history, chat, and import/export workflows.

## Problem Description

Teams and students often need to write documents together in real time but lack a lightweight, easy-to-deploy alternative to large commercial editors. Traditional workflows (sending files back and forth, copy-paste merging, and delayed updates) cause:

- Version confusion and accidental overwrites.
- No clear visibility into who is currently editing.
- Poor collaboration speed during hackathons, project reviews, and classroom teamwork.
- Missing or fragile revision tracking.

CollabEditor solves this by providing a Google Docs-like experience with live co-editing, presence, cursor tracking, history, and recovery in a single web app.

## Live Deployment and Repository Details

- Backend URL: https://collabeditorhackathon-production.up.railway.app
- Frontend URL: https://collab-editor-frontend-roan.vercel.app/
- GitHub Repository: https://github.com/Muthupandi11/collab_editor_hackathon
- MongoDB Connection: set via `MONGODB_URI` environment variable (not committed to repository)

Security note:
- Never commit database credentials in source control. Use environment variables and secret managers.

## 1. Project Overview

### Core capabilities
- Real-time text synchronization across multiple users (Yjs + Socket.IO).
- User presence indicators (who is online, who is currently editing).
- Colored cursor tracking per user.
- Revision history with restore support.
- In-app collaboration chat.
- Import support (TXT files only).
- Export support (TXT, JSON, HTML, Markdown, Word-compatible, PDF print flow).

### Text formatting tools available
- Headings: H1, H2, H3.
- Paragraph formatting and alignment (left, center, right, justify).
- Font family and font size controls.
- Inline styles: bold, italic, underline, strike.
- Advanced inline styles: subscript, superscript.
- Colors: text color and highlight color.
- Lists: bullet list and numbered list.
- Block styles: blockquote and code block.
- Insert tools: horizontal rule and slash-command quick insert.
- Template starter cards: meeting notes, project plan, blog post, blank document.
- Page view controls: Web (fluid), A4, and Letter canvas modes.

### Repository layout

```text
backend/    Express API, Socket.IO collaboration server, MongoDB persistence
frontend/   React + Vite app, TipTap editor, collaboration UI
docs/       Deployment and API notes
scripts/    Utility scripts
```

## 2. Tech Stack

### Frontend
- React 18
- Vite
- TipTap editor
- Yjs + y-protocols + y-prosemirror
- Socket.IO client
- Lucide React icons

### Backend
- Node.js (ES modules)
- Express
- Socket.IO
- Yjs + y-protocols
- Mongoose
- MongoDB Atlas
- Multer (file uploads)
- Mammoth (server-side DOCX parsing for future enhancement)
- pdf-parse (server-side PDF parsing for future enhancement)

### Deployment
- Frontend: Vercel
- Backend: Render/Railway-style Node web service
- Database: MongoDB Atlas

## 2.1 Packages Used (NPM)

### Frontend runtime dependencies
- react `^18.3.1`
- react-dom `^18.3.1`
- @tiptap/core `^2.6.6`
- @tiptap/react `^2.6.6`
- @tiptap/starter-kit `^2.6.6`
- @tiptap/pm `^2.6.6`
- @tiptap/extension-collaboration `^2.6.6`
- @tiptap/extension-collaboration-cursor `^2.6.6`
- @tiptap/extension-color `^2.27.2`
- @tiptap/extension-highlight `^2.27.2`
- @tiptap/extension-strike `^2.27.2`
- @tiptap/extension-subscript `^2.27.2`
- @tiptap/extension-superscript `^2.27.2`
- @tiptap/extension-text-align `^2.27.2`
- @tiptap/extension-text-style `^2.27.2`
- @tiptap/extension-underline `^2.6.6`
- socket.io-client `^4.7.5`
- yjs `^13.6.18`
- y-protocols `^1.0.6`
- y-prosemirror `^1.2.14`
- lucide-react `^1.7.0`
- lodash `^4.17.21`
- nanoid `^5.1.7`

### Frontend dev dependencies
- vite `^5.4.1`
- @vitejs/plugin-react `^4.3.1`

### Backend runtime dependencies
- express `^4.19.2`
- socket.io `^4.7.5`
- mongoose `^8.6.1`
- cors `^2.8.5`
- dotenv `^16.4.5`
- mammoth `^1.12.0`
- multer `^2.1.1`
- node-fetch `^3.3.2`
- pdf-parse `^2.4.5`
- yjs `^13.6.18`
- y-protocols `^1.0.6`

### Backend dev dependencies
- nodemon `^3.1.4`

### Install commands
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

## 3. Architecture Overview

### High-level flow

```text
Browser A (React + TipTap)      Browser B (React + TipTap)
		  |                                 |
		  |---- Socket.IO realtime ---------|
		  |                \               /
		  |                 \             /
		  |                Express + Socket.IO server
		  |                         |
		  |---------------- REST API|
									|
								MongoDB Atlas
					(documents, metadata, revisions)
```

### Data and sync model
- TipTap uses the Yjs document as collaborative source of truth for live editing.
- Socket.IO transports Yjs updates and awareness events (presence/cursor metadata).
- REST API handles document metadata, history listing, manual save/restore, import/export-related calls.
- Revision snapshots are persisted in MongoDB for history and recovery.

### Conflict resolution strategy
- Concurrent edits are resolved via Yjs CRDT merge semantics.
- Users can type in overlapping regions; updates converge without manual merge dialogs.

## 4. Setup Instructions

### Prerequisites
- Node.js 18+
- npm 9+
- MongoDB Atlas URI (or local MongoDB)

### Step A: Backend setup

```bash
cd backend
npm install
```

Create `backend/.env` with at least:

```env
MONGODB_URI=<your_mongodb_connection_string>
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

Start backend:

```bash
npm run dev
```

### Step B: Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_BACKEND_URL=http://localhost:4000
```

Start frontend:

```bash
npm run dev
```

### Step C: Open the app
- Visit `http://localhost:5173/?room=demo-room`
- Open the same URL in a second tab/window with a different user name.

## 5. Environment Variables

### Backend variables
- `MONGODB_URI` (required): MongoDB connection string.
- `PORT` (optional): backend port (`4000` locally).
- `CLIENT_ORIGIN` (recommended): allowed frontend origin for CORS.
- `FRONTEND_URL` (optional): additional allowed frontend origin.
- `NODE_ENV` (optional): `development` or `production`.

### Frontend variables
- `VITE_BACKEND_URL` (recommended): base backend URL.
- `VITE_API_URL` (fallback supported).
- `VITE_SOCKET_URL` (fallback supported).

## 6. Run and Verify

### Local verification checklist
1. Open app in two tabs with same room ID.
2. Type in tab A and verify instant reflection in tab B.
3. Confirm presence panel shows both users online.
4. Confirm cursor labels are visible and color-coded.
5. Save (`Ctrl+S`) and verify history updates.
6. Restore a revision and verify both tabs converge.

## 7. Deployment Notes

### Frontend (Vercel)
- Project root: `frontend`
- Build command: `npm run build`
- Output: Vite `dist`

### Backend (Render/Node)
- Project root: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Health endpoint: `/health`

See full deployment guide in `docs/deployment.md`.

## 8. AI Tools Used

This project has been AI-assisted during implementation and debugging.

Policy compliance note:
- All AI tools used in this project are disclosed in this section.
- No additional undisclosed AI tooling was used for implementation, debugging, or documentation.

- GitHub Copilot Chat
- OpenAI ChatGPT (GPT-5.3)
- GPT-5.3-Codex model (via Copilot tooling)

AI assistance was used for:
- Iterative bug triage and patch drafting
- Refactoring and realtime sync hardening
- Documentation and deployment guidance

## 9. Known Limitations

- No full automated test suite yet (manual validation is primary).
- Large frontend bundle size warning in production builds.
- Chat/history scale is tuned for hackathon usage, not large enterprise load.
- Restore flow and revision UX are functional but can be further optimized for very high-frequency edits.
- Security hardening (strict CORS/domain lockdown, rate limits, auth) should be strengthened for production beyond hackathon scope.

## 10. Future Improvements

- Add integration and E2E tests for multi-user scenarios.
- Add structured observability (metrics, tracing, error dashboards).
- Improve bundle splitting and performance budgets.
- Add stronger role-based auth and document access controls.
- Re-enable multi-format import (DOCX/PDF/Google Docs) behind feature flags after broader production validation.
- Add OCR-based import for scanned PDFs (image-only files).
- Add import preview panel before replacing document content.
- Add per-import audit logs (source, size, user, timestamp) for debugging and compliance.

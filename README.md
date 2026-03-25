# LifeOS – Professional Productivity App

> A beautiful, fast productivity tool with **professional UX**, **Undo/Redo**, **keyboard shortcuts**, and **persistent data synchronization**.

---

## 🚀 Quick Start (5 Minutes)

### 1. Install MongoDB
```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Or use MongoDB Atlas (cloud, free tier)
# https://www.mongodb.com/cloud/atlas
```

### 2. Configure & Start
```bash
# Install dependencies
npm install

# Start everything (backend + frontend)
npm run dev:all
```

### 3. Open in Browser
```
http://localhost:5173
```

**That's it!** ✨ Your app is now running with persistent storage.

---

## 📚 Documentation

| Document | Purpose | Read Time |
|----------|---------|-----------|
| **[BACKEND_OVERVIEW.md](./BACKEND_OVERVIEW.md)** | 📋 Complete backend system overview (START HERE!) | 5 min |
| **[BACKEND_QUICKSTART.md](./BACKEND_QUICKSTART.md)** | ⚡ 5-minute setup guide with cURL examples | 5 min |
| **[backend/API_DOCUMENTATION.md](./backend/API_DOCUMENTATION.md)** | 🔧 Complete API reference with all endpoints | 10 min |
| **[BACKEND_DEPLOYMENT.md](./BACKEND_DEPLOYMENT.md)** | 🌍 Deploy to Heroku, AWS, DigitalOcean, or Google Cloud | 15 min |
| **[PRODUCTION_ENHANCEMENTS.md](./PRODUCTION_ENHANCEMENTS.md)** | ✨ Frontend features: Undo/Redo, keyboard shortcuts, more | 10 min |

---

## ✨ Features

### Frontend (React + TypeScript)
- ✅ Professional Notion-like UI with Tailwind CSS
- ✅ **Undo/Redo system** (Ctrl+Z / Ctrl+Shift+Z)
- ✅ **Keyboard shortcuts** (Delete for row deletion, Arrow keys for navigation)
- ✅ **Bulk operations** (Delete/Complete multiple tasks instantly)
- ✅ **Smooth animations** (Fade-in/fade-out transitions)
- ✅ **Dark/Light theme** (With persistence)
- ✅ **Loading states** (Animated spinners)
- ✅ **Smart empty states** (Context-aware guidance)
- ✅ **Real-time sync feedback** (Shows when saving to backend)
- ✅ **Error handling** (Clear error messages with recovery options)

### Backend (Express + Node.js)
- ✅ **REST API** with 8 endpoints for tasks and columns
- ✅ **MongoDB database** for persistent storage
- ✅ **MVC + Service layer** architecture
- ✅ **Error handling** with meaningful error messages
- ✅ **CORS enabled** for frontend integration
- ✅ **Indexed queries** for performance
- ✅ **Environment configuration** for dev/prod

### Data Persistence
- ✅ **All tasks and columns saved** permanently in MongoDB
- ✅ **Syncs automatically** between frontend and backend
- ✅ **Survives page reloads** and browser restarts
- ✅ **No localStorage limitations** (unlimited data)

---

## 🏗️ Architecture

### Full Stack Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  - Components, State Management, Undo/Redo                  │
│  - Keyboard Shortcuts, Dark Theme, Animations               │
└────────────────────┬────────────────────────────────────────┘
										 │ HTTP Requests (JSON)
										 ↓
┌─────────────────────────────────────────────────────────────┐
│              API Layer (Express.js)                          │
│  - REST endpoints for tasks and columns                      │
│  - Request validation and error handling                     │
└─────────────────┬───────────────────────────────────┬────────┘
									│                                   │
					 ┌──────▼──────┐                   ┌───────▼──────┐
					 │ Controllers  │                   │   Services   │
					 │ - Auth       │                   │ - Business   │
					 │ - Validation │◄──────────────────│   Logic      │
					 └──────┬───────┘                   └───────┬──────┘
									│                                   │
									└───────────────┬───────────────────┘
																	│
													┌───────▼───────┐
													│   Mongoose    │
													│   Models      │
													└───────┬───────┘
																	│
													┌───────▼────────┐
													│    MongoDB     │
													│   Database     │
													└────────────────┘
```

### Frontend
- App state and UI in src
- API client in src/services/api.ts
- Data flows through HTTP instead of localStorage for tasks/columns

### Backend
- Server entry: backend/server.js
- App wiring: backend/app.js
- Database config: backend/config/db.js
- Models: backend/models
- Services: backend/services
- Controllers: backend/controllers
- Routes: backend/routes

---

## 📊 Data Models

### Task
```json
{
	"id": "task-001",
	"userId": "default",
	"values": {
		"name": "Build API",
		"dueDate": "2026-04-01",
		"priority": "High"
	},
	"completed": false,
	"createdAt": "2026-03-19T10:00:00Z",
	"completedAt": null
}
```

### Column
```json
{
	"id": "col-001",
	"userId": "default",
	"name": "Priority",
	"type": "select",
	"options": ["Low", "Medium", "High"]
}
```

### Supported Column Types
- `text` - Plain text
- `date` - Date picker (YYYY-MM-DD)
- `number` - Numeric values
- `select` - Dropdown options

---

## 🔗 API Endpoints

### Task Routes
- GET /api/tasks
- POST /api/tasks
- PUT /api/tasks/:id
- DELETE /api/tasks/:id

### Column Routes
- GET /api/columns
- POST /api/columns
- PUT /api/columns/:id
- DELETE /api/columns/:id

### Health Check
- GET /api/health

---

## ⚙️ Environment Configuration

### Backend (.env in backend/)

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/lifeos
NODE_ENV=development
```

### Frontend (.env in root)

```env
VITE_API_BASE_URL=/api
```

### Notes
- In dev, Vite proxies `/api` to `http://localhost:4000`
- In production, update `VITE_API_BASE_URL` to your backend URL
- For MongoDB Atlas, update `MONGODB_URI` with your connection string

---

## 🎮 Commands

1. Install dependencies:
```bash
npm install
```

2. Start backend only:
```bash
npm run server
```

3. Start frontend only:
```bash
npm run dev
```

4. Start both together:
```bash
npm run dev:all
```

---

## ✅ Verify Setup

### MongoDB Running?
```bash
mongosh  # or mongo
> db.admin.ping()
# Should return { ok: 1 }
```

### Backend Running?
```bash
curl http://localhost:4000/api/health
# Should return { "status": "ok" }
```

### Frontend Syncing?
1. Create a task in the UI
2. Refresh the page
3. Task should still be there (saved in MongoDB)
4. Check backend: `curl http://localhost:4000/api/tasks`

---

## 🚀 Deployment

Ready to go live? See [BACKEND_DEPLOYMENT.md](./BACKEND_DEPLOYMENT.md) for:
- **Heroku** (simplest, free tier available)
- **DigitalOcean** (best price/performance)
- **AWS** (most control)
- **Google Cloud Run** (serverless)

---

## 📖 Frontend Integration Details

### How It Works
- On load, frontend fetches columns and tasks from API.
- Task create/update/delete operations call task endpoints.
- Column create/update/delete operations call column endpoints.
- Theme still uses localStorage (UI preference only).

### Why It's Scalable
- Data persistence is centralized in MongoDB.
- Service layer handles business logic separately.
- Each backend component is independent and testable.
- Easy to add caching, authentication, or other middleware.

---

## 🐛 Troubleshooting

### MongoDB Connection Failed
- Is MongoDB running? (`brew services list`)
- Is connection string correct in `.env`?
- Try MongoDB Atlas instead (cloud, free)

### Port 4000 Already in Use
- Change `PORT` in `backend/.env`
- Or kill process using port: `lsof -i :4000`

### Tasks Not Syncing
- Check backend logs for errors
- Check browser console for network errors
- Verify API URL: `VITE_API_BASE_URL=/api`

### CORS Error
- CORS is already enabled in `backend/app.js`
- If still having issues, check backend logs

See [BACKEND_QUICKSTART.md](./BACKEND_QUICKSTART.md) for more troubleshooting.

---

## 📚 Project Structure

```
lifeos-app/
├── src/                          ← Frontend React code
│   ├── App.tsx                   ← Main app component
│   ├── components/               ← React components
│   ├── services/api.ts           ← API client
│   ├── utils/                    ← Utilities (undo/redo, keyboard)
│   └── App.css / index.css        ← Styles
├── backend/                      ← Backend Node.js code
│   ├── server.js                 ← Entry point
│   ├── app.js                    ← Express app
│   ├── config/db.js              ← MongoDB connection
│   ├── models/                   ← Mongoose schemas
│   ├── controllers/              ← Request handlers
│   ├── services/                 ← Business logic
│   ├── routes/                   ← API endpoints
│   └── .env                      ← Environment variables
├── public/                       ← Static assets
├── package.json                  ← Frontend dependencies
├── vite.config.ts                ← Vite config
├── tsconfig.json                 ← TypeScript config
├── README.md                     ← This file
├── BACKEND_OVERVIEW.md           ← Backend system overview
├── BACKEND_QUICKSTART.md         ← Quick start guide
├── BACKEND_DEPLOYMENT.md         ← Deployment guide
├── PRODUCTION_ENHANCEMENTS.md    ← Frontend features
└── eslint.config.js              ← Linting config
```

---

## 🎯 Next Steps

1. **Try it now**: `npm run dev:all`
2. **Read the docs**: Start with [BACKEND_OVERVIEW.md](./BACKEND_OVERVIEW.md)
3. **Explore**: Create tasks, undo them (Ctrl+Z), try keyboard shortcuts
4. **Deploy**: When ready, follow [BACKEND_DEPLOYMENT.md](./BACKEND_DEPLOYMENT.md)

---

## 📞 Documentation at a Glance

- **Need to set up?** → [BACKEND_QUICKSTART.md](./BACKEND_QUICKSTART.md)
- **Want API details?** → [backend/API_DOCUMENTATION.md](./backend/API_DOCUMENTATION.md)
- **Ready to deploy?** → [BACKEND_DEPLOYMENT.md](./BACKEND_DEPLOYMENT.md)
- **Learning features?** → [PRODUCTION_ENHANCEMENTS.md](./PRODUCTION_ENHANCEMENTS.md)
- **System overview?** → [BACKEND_OVERVIEW.md](./BACKEND_OVERVIEW.md)

---

## 🎉 You're All Set!

Your professional, full-stack LifeOS app is ready to use. Start with:

```bash
npm install
npm run dev:all
```

**Happy building!** 🚀

---

**LifeOS** – Smart productivity for the modern work era.  
*Built with React, Express, MongoDB, and love.* ❤️
- HTTP API decouples frontend from storage details.
- Modular backend layout keeps business logic clean and extendable.

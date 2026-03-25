# LifeOS Backend Quick Start Guide

## 🚀 Get Running in 5 Minutes

### 1. Install MongoDB (Choose One)

**Option A: Local MongoDB (macOS)**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Option B: Local MongoDB (Windows/WSL)**
```bash
# Install via Docker (easiest)
docker run --name mongodb -p 27017:27017 -d mongo:latest

# Or install locally: https://docs.mongodb.com/manual/installation/
```

**Option C: MongoDB Atlas (Cloud - Free)**
- Go to https://www.mongodb.com/cloud/atlas
- Create free account
- Create cluster
- Copy connection string
- Update `backend/.env` with connection string

---

### 2. Configure Backend

Copy environment template:
```bash
cd backend
cp .env.example .env
```

`backend/.env`:
```
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/lifeos
NODE_ENV=development
```

---

### 3. Start Backend

```bash
# Option A: Just backend
npm run server

# Option B: Backend + Frontend together (recommended)
npm run dev:all
```

**Expected output**:
```
MongoDB connected
LifeOS backend running on http://localhost:4000
LifeOS frontend running on http://localhost:5173
```

---

### 4. Test API

**Health Check**:
```bash
curl http://localhost:4000/api/health
# Response: { "status": "ok" }
```

**Fetch Tasks**:
```bash
curl http://localhost:4000/api/tasks
# Response: [] (empty array initially)
```

---

### 5. Start Creating Data

Open frontend: http://localhost:5173

Now all data automatically syncs to MongoDB!

---

## 📊 API Overview

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/tasks` | Get all tasks |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| GET | `/api/columns` | Get all columns |
| POST | `/api/columns` | Create column |
| PUT | `/api/columns/:id` | Update column |
| DELETE | `/api/columns/:id` | Delete column |

---

## 🔄 How It Works

### Frontend → Backend Flow

```
User Creates Task
    ↓
Frontend: setTasks([...tasks, newTask])
    ↓
Frontend: syncWithApi(createTaskApi(newTask))
    ↓
API Call: POST /api/tasks
    ↓
Backend: Express receives request
    ↓
Backend: taskController.createTaskController()
    ↓
Backend: taskService.createTask()
    ↓
Backend: Mongoose saves to MongoDB
    ↓
Backend: Returns 201 + task object
    ↓
Frontend: showFeedback("success", "Task created!")
    ↓
UI Updates with persisted data
```

---

## 📁 Backend Structure

```
backend/
├── server.js              ← Entry point
├── app.js                 ← Express config
├── .env                   ← [EDIT THIS] Environment variables
│
├── config/
│   └── db.js             ← MongoDB connection
│
├── models/
│   ├── Task.js           ← Task schema
│   └── Column.js         ← Column schema
│
├── controllers/
│   ├── taskController.js       ← Request handlers
│   └── columnController.js
│
├── services/
│   ├── taskService.js          ← Business logic
│   └── columnService.js
│
└── routes/
    ├── taskRoutes.js           ← API endpoints
    └── columnRoutes.js
```

**Key Files to Understand**:
1. `server.js` - Starts the app
2. `models/Task.js` - Defines task structure in DB
3. `services/taskService.js` - CRUD operations
4. `controllers/taskController.js` - Handles API requests

---

## 🐛 Troubleshooting

### "MongoDB connection failed"

```bash
# Check if MongoDB is running
ps aux | grep mongod

# Start MongoDB
brew services start mongodb-community  # macOS
docker start mongodb                   # Docker

# Or use MongoDB Atlas instead (cloud)
```

### "Port 4000 already in use"

```bash
# Kill process on port 4000
lsof -i :4000
kill -9 <PID>

# Or change port in .env
PORT=5000
```

### "Task not syncing to database"

1. Check backend is running: `curl http://localhost:4000/api/health`
2. Check MongoDB is running: `mongo` or `mongosh`
3. Check `.env` has correct `MONGODB_URI`
4. Check browser console for API errors
5. Check backend logs for errors

### "CORS Error"

CORS is already enabled in `app.js`, but if you see CORS errors:
- Check frontend URL is correct
- Check backend is on localhost:4000
- Check `frontend/.env` has:
  ```
  VITE_API_BASE_URL=/api
  ```

---

## 📝 Common Operations

### Create a Task via API

```bash
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "id": "task-001",
    "values": {
      "name": "My First Task",
      "dueDate": "2026-03-25",
      "priority": "high"
    },
    "completed": false,
    "createdAt": "2026-03-19T10:00:00Z"
  }'
```

### Get All Tasks

```bash
curl http://localhost:4000/api/tasks
```

### Update a Task

```bash
curl -X PUT http://localhost:4000/api/tasks/task-001 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'
```

### Delete a Task

```bash
curl -X DELETE http://localhost:4000/api/tasks/task-001
```

---

## 🔑 Key Concepts

### Users
- Currently hardcoded to `"default"` userId
- All tasks/columns scoped to userId in database
- Easy to extend for multi-user support

### Collections
- **tasks** - Stores all user tasks with dynamic column values
- **columns** - Stores column definitions (name, type, options)

### Schemas
- **Flexible**: `values` object can store any data
- **Indexed**: Fast queries by `id` and `userId`
- **Timestamped**: `createdAt`, `updatedAt` tracking

---

## 🚢 Next Steps

### Immediate
1. ✅ Install MongoDB
2. ✅ Configure .env
3. ✅ Start backend: `npm run server`
4. ✅ Test API: `curl http://localhost:4000/api/health`

### Short-term
- Add user authentication (multi-user support)
- Add validation layer
- Add logging middleware
- Add error tracking (Sentry)

### Long-term
- Scale to multiple backend instances
- Add WebSocket for real-time sync
- Add GraphQL API layer
- Add search/advanced filtering
- Deploy to production

---

## 📚 Documentation

- **Full API Docs**: See `backend/API_DOCUMENTATION.md`
- **Deployment Guide**: See `BACKEND_DEPLOYMENT.md`
- **Frontend API**: See `src/services/api.ts`

---

## ✅ Verification Checklist

- [ ] MongoDB running
- [ ] Backend started (`npm run server`)
- [ ] API health check works (`curl http://localhost:4000/api/health`)
- [ ] Frontend loads (`http://localhost:5173`)
- [ ] Can create task in UI
- [ ] Task appears in MongoDB
- [ ] Can view task via: `curl http://localhost:4000/api/tasks`

---

## 🎓 Learning Resources

- **Express.js**: https://expressjs.com/
- **MongoDB**: https://docs.mongodb.com/
- **Mongoose**: https://mongoosejs.com/
- **REST APIs**: https://restfulapi.net/

---

## 💡 Tips

1. **Use REST Client extension**: Install "REST Client" in VS Code
2. **Monitor MongoDB**: Use MongoDB Compass GUI
3. **Debug backend**: Add `console.log()` in services
4. **Test locally first**: Before deploying, test everything locally
5. **Keep `.env` secret**: Never commit `.env` to git

---

## 🆘 Need Help?

1. Check `API_DOCUMENTATION.md` for endpoint details
2. Check backend logs: `npm run server` (watch terminal)
3. Check MongoDB: `mongosh` → `db.tasks.find()`
4. Check frontend Network tab: Browser DevTools → Network
5. Check Error Boundary: Frontend shows component errors

---

**You're all set!** 🎉

Your LifeOS app now has a persistent backend. Start creating tasks and watch them sync to MongoDB in real-time!

---

**Generated**: March 19, 2026  
**Status**: Production Ready

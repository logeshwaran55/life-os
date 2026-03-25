# LifeOS Backend API Documentation

## Overview
LifeOS Backend is a Node.js + Express + MongoDB REST API that powers the LifeOS productivity application. It provides persistent data storage and retrieval for tasks and columns.

---

## Architecture

### Technology Stack
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose)
- **Features**: CORS enabled, JSON request/response

### Folder Structure
```
backend/
├── server.js           # Entry point - starts Express server
├── app.js              # Express app configuration
├── package.json        # Backend dependencies
├── .env                # Environment variables
├── config/
│   └── db.js          # MongoDB connection
├── models/
│   ├── Task.js        # Task Mongoose schema
│   ├── Column.js      # Column Mongoose schema
│   └── User.js        # User model (for future expansion)
├── controllers/
│   ├── taskController.js    # Task route handlers
│   └── columnController.js  # Column route handlers
├── services/
│   ├── taskService.js       # Task business logic
│   └── columnService.js     # Column business logic
└── routes/
    ├── taskRoutes.js        # Task API endpoints
    └── columnRoutes.js      # Column API endpoints
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- MongoDB running locally or remote connection string

### Installation

1. **Install dependencies** (from root directory):
```bash
npm install
```

2. **Configure environment** (.env):
```
PORT=5000
MONGODB_URI=mongodb://<username>:<password>@cluster.mongodb.net/lifeos
NODE_ENV=development
```

3. **Start MongoDB**:
```bash
# Local MongoDB (macOS with Homebrew)
brew services start mongodb-community

# Local MongoDB (Windows with WSL)
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env
```

4. **Start the backend**:
```bash
# Single terminal
npm run server

# Or with frontend (concurrent)
npm run dev:all
```

Server runs on `http://localhost:4000`

---

## API Endpoints

### Health Check
```
GET /api/health
```
**Response**: `{ "status": "ok" }`

---

## TASKS API

### 1. Get All Tasks
```http
GET /api/tasks
X-Requested-With: XMLHttpRequest
```

**Response** (200 OK):
```json
[
  {
    "id": "1710922461234-abc123",
    "userId": "default",
    "values": {
      "name": "Build dashboard",
      "dueDate": "2026-03-25",
      "priority": "high"
    },
    "completed": false,
    "createdAt": "2026-03-19T10:00:00Z",
    "completedAt": null
  }
]
```

---

### 2. Create Task
```http
POST /api/tasks
Content-Type: application/json

{
  "id": "1710922461234-abc123",
  "values": {
    "name": "Build dashboard",
    "dueDate": "2026-03-25",
    "priority": "high"
  },
  "completed": false,
  "createdAt": "2026-03-19T10:00:00Z"
}
```

**Response** (201 Created):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "id": "1710922461234-abc123",
  "userId": "default",
  "values": {
    "name": "Build dashboard",
    "dueDate": "2026-03-25",
    "priority": "high"
  },
  "completed": false,
  "createdAt": "2026-03-19T10:00:00Z",
  "completedAt": null
}
```

---

### 3. Update Task
```http
PUT /api/tasks/:id
Content-Type: application/json

{
  "completed": true,
  "completedAt": "2026-03-20T15:30:00Z",
  "values": {
    "name": "Build dashboard",
    "dueDate": "2026-03-25",
    "priority": "high"
  }
}
```

**Response** (200 OK):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "id": "1710922461234-abc123",
  "userId": "default",
  "values": {...},
  "completed": true,
  "createdAt": "2026-03-19T10:00:00Z",
  "completedAt": "2026-03-20T15:30:00Z"
}
```

---

### 4. Delete Task
```http
DELETE /api/tasks/:id
```

**Response** (204 No Content)

---

## COLUMNS API

### 1. Get All Columns
```http
GET /api/columns
```

**Response** (200 OK):
```json
[
  {
    "id": "name",
    "userId": "default",
    "name": "Task Name",
    "type": "text",
    "options": null,
    "createdAt": "2026-01-10T10:00:00.000Z",
    "updatedAt": "2026-01-10T10:00:00.000Z"
  },
  {
    "id": "dueDate",
    "userId": "default",
    "name": "Due Date",
    "type": "date",
    "options": null,
    "createdAt": "2026-01-10T10:00:00.000Z",
    "updatedAt": "2026-01-10T10:00:00.000Z"
  },
  {
    "id": "priority",
    "userId": "default",
    "name": "Priority",
    "type": "select",
    "options": ["low", "medium", "high"],
    "createdAt": "2026-01-10T10:00:00.000Z",
    "updatedAt": "2026-01-10T10:00:00.000Z"
  }
]
```

---

### 2. Create Column
```http
POST /api/columns
Content-Type: application/json

{
  "id": "status",
  "name": "Status",
  "type": "select",
  "options": ["todo", "in-progress", "done"]
}
```

**Response** (201 Created):
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "id": "status",
  "userId": "default",
  "name": "Status",
  "type": "select",
  "options": ["todo", "in-progress", "done"],
  "createdAt": "2026-03-19T10:00:00.000Z",
  "updatedAt": "2026-03-19T10:00:00.000Z"
}
```

---

### 3. Update Column
```http
PUT /api/columns/:id
Content-Type: application/json

{
  "name": "Current Status",
  "options": ["todo", "in-progress", "done", "archived"]
}
```

**Response** (200 OK): Updated column object

---

### 4. Delete Column
```http
DELETE /api/columns/:id
```

**Response** (204 No Content)

---

## Database Schemas

### Task Collection
```javascript
{
  id: String (unique, indexed),           // Client-generated ID
  userId: String (indexed),               // User identifier
  values: Object,                         // Dynamic column values
  completed: Boolean,                     // Task completion status
  createdAt: String (ISO 8601),          // Creation timestamp
  completedAt: String or null,           // Completion timestamp
  _id: ObjectId (MongoDB auto-generated)  // Database ID
}
```

**Indexes**: `id`, `userId`

### Column Collection
```javascript
{
  id: String (unique, indexed),           // Column identifier
  userId: String (indexed),               // User identifier
  name: String,                           // Display name
  type: String (enum),                    // text|date|number|select
  options: Array<String> or undefined,    // Select options
  createdAt: Timestamp (auto),            // Creation timestamp
  updatedAt: Timestamp (auto),            // Last update timestamp
  _id: ObjectId (MongoDB auto-generated)  // Database ID
}
```

**Indexes**: `id`, `userId`

---

## Error Handling

### Common HTTP Status Codes

| Code | Scenario | Example |
|------|----------|---------|
| **200** | Successful GET/PUT | Retrieve task, update column |
| **201** | Successful POST | Create new task/column |
| **204** | Successful DELETE | Task deleted |
| **400** | Bad request | Invalid data, missing required fields |
| **404** | Not found | Task/column ID doesn't exist |
| **500** | Server error | Database connection failed |

### Error Response Format
```json
{
  "message": "Human-readable error message",
  "error": "Original error details"
}
```

**Example**:
```json
{
  "message": "Failed to create task",
  "error": "Task id is required"
}
```

---

## Service Layer (Business Logic)

### Task Service (`services/taskService.js`)
- `getTasks(userId)` - Retrieve all tasks for user
- `createTask(payload, userId)` - Create new task
- `updateTask(taskId, updates, userId)` - Update existing task
- `deleteTask(taskId, userId)` - Delete task

### Column Service (`services/columnService.js`)
- `getColumns(userId)` - Retrieve all columns for user
- `createColumn(payload, userId)` - Create new column
- `updateColumn(columnId, updates, userId)` - Update column
- `deleteColumn(columnId, userId)` - Delete column

---

## Frontend Integration

The frontend (React) connects via `src/services/api.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const fetchTasks = () => request<Task[]>("/tasks", "GET");
export const createTask = (task: Task) => request<Task>("/tasks", "POST", task);
export const updateTask = (taskId: string, updates: Partial<Task>) =>
  request<Task>(`/tasks/${taskId}`, "PUT", updates);
export const deleteTask = (taskId: string) => request<void>(`/tasks/${taskId}`, "DELETE");

export const fetchColumns = () => request<Column[]>("/columns", "GET");
export const createColumn = (column: Column) => request<Column>("/columns", "POST", column);
export const updateColumn = (columnId: string, updates: Partial<Column>) =>
  request<Column>(`/columns/${columnId}`, "PUT", updates);
export const deleteColumn = (columnId: string) => request<void>(`/columns/${columnId}`, "DELETE");
```

---

## Example cURL Requests

### Get All Tasks
```bash
curl -X GET http://localhost:4000/api/tasks \
  -H "Content-Type: application/json"
```

### Create a Task
```bash
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "id": "task-001",
    "values": {
      "name": "Complete project",
      "dueDate": "2026-03-25",
      "priority": "high"
    },
    "completed": false,
    "createdAt": "2026-03-19T10:00:00Z"
  }'
```

### Update a Task
```bash
curl -X PUT http://localhost:4000/api/tasks/task-001 \
  -H "Content-Type: application/json" \
  -d '{
    "completed": true,
    "completedAt": "2026-03-20T15:00:00Z"
  }'
```

### Delete a Task
```bash
curl -X DELETE http://localhost:4000/api/tasks/task-001 \
  -H "Content-Type: application/json"
```

### Get All Columns
```bash
curl -X GET http://localhost:4000/api/columns \
  -H "Content-Type: application/json"
```

### Create a Column
```bash
curl -X POST http://localhost:4000/api/columns \
  -H "Content-Type: application/json" \
  -d '{
    "id": "status",
    "name": "Status",
    "type": "select",
    "options": ["todo", "in-progress", "done"]
  }'
```

---

## Testing the API

### Using Postman
1. Create a new collection "LifeOS API"
2. Add requests for each endpoint
3. Set BaseURL to `http://localhost:4000`
4. Use examples above for request bodies

### Using REST Client (VS Code Extension)
Create `test.http` in backend folder:
```http
### Get all tasks
GET http://localhost:4000/api/tasks HTTP/1.1

### Create task
POST http://localhost:4000/api/tasks HTTP/1.1
Content-Type: application/json

{
  "id": "test-task-001",
  "values": {
    "name": "Test Task"
  },
  "completed": false,
  "createdAt": "2026-03-19T10:00:00Z"
}
```

---

## Deployment

### Local Development
```bash
npm run dev:all  # Runs both backend and frontend
```

### Production Build
```bash
npm run build    # Builds frontend
npm run server   # Start backend separately
```

### Environment Variables (Production)
```
PORT=4000
MONGODB_URI=mongodb://user:pass@cluster.mongodb.net/lifeos
NODE_ENV=production
```

### Deploy to Heroku
```bash
# Install Heroku CLI
heroku login
heroku create lifeos-app
heroku config:set MONGODB_URI=<your-mongodb-connection>
git push heroku main
```

### Deploy to AWS/Azure/GCP
See deployment guides for Node.js apps with MongoDB Atlas

---

## Troubleshooting

### MongoDB Connection Failed
- **Check**: Is MongoDB running? `mongod --version`
- **Fix**: Start MongoDB: `brew services start mongodb-community`
- **Alternative**: Use MongoDB Atlas (cloud)

### Port Already in Use
- **Check**: `lsof -i :4000`
- **Fix**: Change PORT in .env or kill process on port 4000

### CORS Errors
- **Check**: Are requests coming from correct origin?
- **Fix**: CORS is enabled for all origins in `app.js`

### Task Not Found (404)
- **Check**: Is task ID correct?
- **Fix**: Verify ID matches database record

---

## Future Enhancements

- [ ] User authentication & multi-user support
- [ ] WebSocket for real-time sync
- [ ] Batch operations endpoint
- [ ] Search/filtering API
- [ ] Export to CSV/JSON
- [ ] Audit logging
- [ ] Rate limiting
- [ ] GraphQL API layer

---

## API Base URLs

- **Development**: `http://localhost:4000/api`
- **Frontend Dev**: Uses proxy or `VITE_API_BASE_URL` environment variable
- **Production**: Depends on deployment platform

---

## Code Examples

### Frontend - Fetch Tasks
```typescript
import { fetchTasks } from "./services/api";

const loadTasks = async () => {
  try {
    const tasks = await fetchTasks();
    setTasks(tasks);
  } catch (error) {
    console.error("Failed to load tasks:", error);
  }
};
```

### Frontend - Create Task
```typescript
import { createTask } from "./services/api";

const newTask = {
  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  values: {
    name: "New Task",
    dueDate: "2026-03-25",
    priority: "medium"
  },
  completed: false,
  createdAt: new Date().toISOString()
};

const created = await createTask(newTask);
```

---

**Generated**: March 19, 2026  
**Status**: Production Ready

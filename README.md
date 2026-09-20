# Student Management System

A production-ready MERN student directory built for a three-tier cloud architecture:

`Browser → Netlify (React/Vite) → Render (Node/Express REST API) → MongoDB Atlas`

The database is never accessed by the browser; React uses HTTPS REST requests to the Express application tier, which alone connects to MongoDB Atlas.

## Features

- Create, view, update, and delete students
- Live search by student ID or name
- Server-side validation for required fields, email, semester (1–12), and duplicate student IDs
- Responsive plain-CSS dashboard with success/error feedback
- Environment-only database and cross-origin configuration

## Technologies

Frontend: React, Vite, Axios, React Hooks, CSS. Backend: Node.js, Express, Mongoose, dotenv, cors, nodemon. Database: MongoDB Atlas.

## Folder structure

```text
student-management-system/
├── frontend/       # Netlify presentation layer
│   ├── src/        # React UI and api.js
│   └── vite.config.js
├── backend/        # Render application layer
│   ├── config/ controllers/ models/ routes/
│   ├── server.js
│   └── .env.example
└── README.md
```

## Local installation

Create an Atlas database and database user. In Atlas Network Access, allow your development IP (and later Render). Obtain the connection string and put it in `backend/.env`, created from `.env.example`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
FRONTEND_URL=http://localhost:5173
```

Start the API:

```bash
cd backend
npm install
npm run dev
```

Start the client in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/students` | List students |
| GET | `/api/students/:id` | Get one student |
| POST | `/api/students` | Create student |
| PUT | `/api/students/:id` | Update student |
| DELETE | `/api/students/:id` | Delete student |

Request fields: `studentId`, `name`, `email`, `department`, `semester`, and `contact`. Successful mutations return `{ "success": true, "message": "..." }`.

## Deploy to Render

1. Push this project to GitHub and create a Render **Web Service** with `backend` as Root Directory.
2. Set Build Command to `npm install` and Start Command to `npm start`.
3. Add `MONGODB_URI` and `FRONTEND_URL` environment variables. Set `FRONTEND_URL` to the final Netlify site URL exactly (for example, `https://example.netlify.app`). Render provides `PORT`; no hardcoded port is needed.
4. Permit Render access in MongoDB Atlas Network Access (for a coursework demo, Atlas's `0.0.0.0/0` rule is commonly used; secure it appropriately for production).

## Deploy to Netlify

1. Edit `frontend/src/api.js`: replace `http://localhost:5000/api` with `https://YOUR-RENDER-SERVICE.onrender.com/api`.
2. Create a Netlify site with `frontend` as the base directory.
3. Use Build Command `npm run build` and Publish Directory `dist`.
4. Redeploy Render after setting the Netlify URL in `FRONTEND_URL`.

## Testing

Use the dashboard to add a valid student, edit it, search by name/ID, and delete it. You may also test the REST API with Postman. Confirm invalid email, blank fields, out-of-range semester, and duplicate student ID return JSON errors. After deployment, test only via the Netlify URL to confirm the CORS and three-tier integration.

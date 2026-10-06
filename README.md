# MindEase

MindEase is a full-stack student wellness application with journaling, AI-assisted emotion analysis, tasks, weekly wellness insights, consent-controlled stress sharing, and an administrator support dashboard.

## Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: PostgreSQL / Supabase
- AI: Groq OpenAI-compatible API

## Local setup

### 1. Database
Run `database/schema.sql` on a new database.
For an existing MindEase database, run `database/admin_migration.sql` once.

### 2. Backend
Copy `backend/.env.example` to `backend/.env` and fill in real secrets.

```bash
cd backend
npm install
npm run dev
```

### 3. Frontend
Copy `frontend/.env.example` to `frontend/.env` if needed.

```bash
cd frontend
npm install
npm run dev
```

Student app: `http://localhost:5173`
Admin login: `http://localhost:5173/admin-login`

## Privacy / admin alert flow
A student can enable **Share my stress level with admin** from the Dashboard. When enabled, only derived stress information is eligible for institutional alerts; journal text, journal images and private AI analysis are not sent to the admin.

A daily stress alert is generated when the derived daily stress percentage is greater than 50%. The daily value is based on the maximum Stress + Anxiety percentage recorded for that student on the current India calendar day.

## Deployment
A simple production setup is: frontend on Vercel, backend on Render (or another Node host), PostgreSQL on Supabase. Set `VITE_API_URL` on the frontend to the deployed backend URL and set the backend environment variables on the backend host.

Never commit `.env` files or API/database credentials. Rotate any credential that has been exposed.

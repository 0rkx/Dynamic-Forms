# Dynamic Form

Dynamic Form brings together web application UI and backend API capabilities based on the code in this repository.

## Overview

This README documents the current implementation of `dynamic-form`. It is based on the checked-in source files, package manifests, and entry points in the repository.

## What It Covers

- web application UI
- backend API
- forms and data collection
- portfolio or website

## Features

- Role-based dashboards and navigation
- Document intake, upload, and parsing flows
- Review queues, status tracking, and task/work-item states
- Gemini/OpenAI integration points for AI-assisted processing
- Authentication or account flow screens
- Database or backend persistence layer
- SEO, metadata, and deployment-oriented website structure

## Tech Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- Python

## Code Highlights

- Entry points: App.tsx, index.html, index.tsx, backend/app.py
- Python dependencies are declared in the repository.
- JavaScript tooling and scripts are declared in package.json.

## Project Structure

- `App.tsx`
- `index.html`
- `package.json`
- `tailwind.config.js`
- `tsconfig.json`
- `vite.config.ts`
- `backend/app.py`
- `backend/README.md`
- `backend/requirements.txt`
- `backend/test_rate_limiting.py`
- `backend/functions/package.json`
- `backend/functions/README.md`
- `backend/functions/repair-manifestos.js`
- `components/DualContextManager.tsx`
- `components/ErrorBoundary.tsx`
- `components/FormEditor.tsx`
- `components/FormPreview.tsx`
- `components/Header.tsx`

## Getting Started

Clone the repository and install the dependencies for the part of the project you want to run.

### Frontend / Node

```bash
npm install
npm run dev
```

### Available Scripts

- `dev`: `vite`
- `dev:full`: `concurrently "npm run dev" "npm run dev:backend"`
- `dev:backend`: `cd backend && python app.py`
- `build`: `vite build`
- `preview`: `vite preview`
- `setup:backend`: `cd backend && pip install -r requirements.txt`
- `prepare:deploy`: `node scripts/prepare-deployment.js`
- `lint`: `echo 'Add linting script here'`
- `test`: `echo 'Add testing script here'`

### Python

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

## Environment Variables

The code references these environment keys:

- `FLASK_ENV`
- `GEMINI_API_KEY`
- `NODE_ENV`
- `PORT`
- `SERVICE_ADMIN_KEY`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_URL`
- `VITE_GOOGLE_API_KEY`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL`

## Python Dependencies

`backend/requirements.txt` includes: `Flask`, `Flask-CORS`, `requests`, `python-dotenv`, `gunicorn`, `Flask-Limiter`

## Development Notes

- Keep generated files, dependency folders, virtual environments, and build outputs out of commits.
- Add screenshots or deployment links here when the project is running in production.
- Update this README when entry points, environment variables, or setup steps change.

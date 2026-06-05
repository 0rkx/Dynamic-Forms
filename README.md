# Dynamic Forms

Dynamic Forms is a full-stack form generation and data collection application built to help users automatically generate conversational forms using AI, collect responses, and analyze the resulting data. It provides an AI-driven form generation flow, a conversational UI for respondents, and an admin dashboard for tracking submissions through a React frontend and a Python backend proxy that interfaces with the Gemini API.

## Table of Contents
- [About the Project](#about-the-project)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Folder Structure](#folder-structure)
- [Important Code Concepts](#important-code-concepts)
- [Architectural Decisions](#architectural-decisions)
- [Data Model](#data-model)
- [Main User Flows](#main-user-flows)
- [Setup Instructions](#setup-instructions)
- [Available Scripts](#available-scripts)
- [Configuration Notes](#configuration-notes)
- [Testing](#testing)
- [Deployment](#deployment)
- [Future Improvements](#future-improvements)
- [Learning Outcomes](#learning-outcomes)
- [Screenshots](#screenshots)
- [License](#license)

## About the Project

The current implementation focuses on solving the problem of rigid, static data collection. Instead of manually building forms question by question, a user can enter a natural language prompt, and the application generates a complete `FormSchema` including questions, types, and logic.

The project is built around a React single-page application that uses Zustand for state management and Supabase for authentication and data persistence. To handle the AI generation securely, a Python Flask backend acts as a proxy to the Gemini API, keeping API keys off the client. The core value of the project lies in its "Dual-Context" AI system, which adapts the form's flow dynamically based on user responses and the original manifesto provided by the form creator.

## Key Features

- **AI Form Generation**
  Users provide a text prompt describing what they want to collect, and the system uses the Gemini API via a Flask proxy to return a structured JSON form schema. The logic for this lives primarily in `lib/formGenerator.ts`.
- **Dynamic Question Types**
  The system supports standard inputs (text, email, multiple-choice) alongside specialized UI components like sliders, mood selectors (emoji-based), and priority matrices. These are rendered through `components/form/QuestionRenderer.tsx`.
- **Conversational Follow-Ups**
  The `lib/enhancedFormBrain.ts` tracks the respondent's conversation state. Based on specific answers, the system can generate a smart follow-up question on the fly instead of relying strictly on predefined logic branches.
- **Admin Dashboard**
  Authenticated users can access `pages/AdminPage.tsx` to view their generated forms, track total views, and inspect individual responses or AI-generated form analytics.
- **Authentication & Persistence**
  User sessions are managed through Supabase Auth, with the state synchronized locally via `store/authStore.ts`. Form schemas and respondent data are stored in a Supabase PostgreSQL database, accessed through `lib/supabaseService.ts`.

## Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | React 18 / Vite / TypeScript | Handles UI rendering, routing (`react-router-dom`), and type safety. |
| Styling | Tailwind CSS / Lucide React | Provides utility-based styling and iconography. |
| State Management | Zustand | Manages global authentication, form data, and configuration state across components. |
| Backend Proxy | Python / Flask | Secures the Gemini API key, handles rate limiting, and sanitizes AI requests and responses. |
| Database & Auth | Supabase | Provides PostgreSQL data storage and user authentication (email/password and Google OAuth). |
| AI Integration | Google Gemini API | Generates the initial form schema and real-time conversational follow-ups. |

## System Architecture

The architecture separates the client-side user experience from the secure AI generation logic and permanent data storage.

```txt
React Client (App.tsx)
  │
  ├─ Zustand Stores (authStore.ts, formStore.ts)
  │    │
  │    └─ Supabase Client (lib/supabase.ts) ──> Supabase Auth & PostgreSQL DB
  │
  └─ AI Services (lib/gemini.ts, lib/formGenerator.ts)
       │
       └─ Flask Backend (backend/app.py) ──> Google Gemini API
```

The React frontend handles all routing and state. When a user requests a new form, the client sends a prompt to the Flask backend. The backend constructs the prompt for Gemini, ensures rate limits aren't exceeded, and returns the JSON payload. Once the form schema is validated on the client, it is saved directly to Supabase via `lib/supabaseService.ts`.

## Folder Structure

```txt
.
├── backend/                  Python Flask proxy server for Gemini AI
│   ├── app.py                Main API routes and rate limiting logic
│   └── requirements.txt      Python dependencies
├── src/                      (Virtual root based on vite.config.ts resolution)
│   ├── components/           Reusable UI elements
│   │   ├── form/             Question rendering and animated transition components
│   │   └── ui/               Base components like Button, Card, Input
│   ├── lib/                  Core business logic and external service integrations
│   │   ├── enhancedFormBrain.ts  Logic for conversational follow-ups
│   │   ├── formGenerator.ts      Functions that request form schemas from the backend
│   │   └── supabaseService.ts    Database access methods
│   ├── pages/                Route-level React components (e.g., AdminPage.tsx)
│   ├── store/                Zustand state management
│   │   ├── authStore.ts      Authentication state and Supabase Auth wrappers
│   │   └── formStore.ts      Local caching for forms and responses
│   ├── App.tsx               Main application shell and routing logic
│   └── types.ts              Shared TypeScript interfaces defining the domain models
```

## Important Code Concepts

### Dual-Context System
The application uses what it calls a "Dual-Context System" defined in `types.ts` (`DualContextAIDecision`, `UserManifestoContext`). This means the AI generating follow-up questions considers both the form creator's original intent (the manifesto) and the current respondent's historical answers.

### Global State with Zustand
The `store/authStore.ts` handles initialization by fetching the current Supabase session on startup and subscribing to auth changes. This makes the `user` object available synchronously to any component without needing React Context providers.

### Error Boundaries
To prevent the entire React tree from crashing if an AI-generated schema contains malformed data, `components/ErrorBoundary.tsx` wraps the main application routes, providing a fallback UI and logging the error.

## Architectural Decisions

**Python Backend Proxy for AI Requests**
The current structure routes Gemini API calls through a Flask server instead of calling the API directly from the Vite frontend. This approach was taken because exposing the `GEMINI_API_KEY` in the browser is a security risk. The Flask proxy ensures the key stays hidden and provides a layer where input sanitization and rate limiting (`test_rate_limiting.py`) can be enforced.

**Supabase for Database and Authentication**
Supabase was chosen to avoid writing a custom Node.js CRUD backend for forms and users. By using the `@supabase/supabase-js` client, the project handles authentication and complex database inserts directly from the frontend, speeding up development while still maintaining row-level security (RLS) in the database.

**Zustand over Redux or Context**
Zustand is used for state management instead of Redux or React Context. The codebase suggests this decision was made because Zustand requires significantly less boilerplate for setting up `authStore` and `formStore`, and it avoids the unnecessary re-renders often associated with deeply nested Context providers.

## Data Model

The core models are defined in `types.ts` and map to the Supabase database schema.

**FormSchema**
Represents a generated form. It includes metadata like `title`, `description`, and `ownerId`, but most importantly contains a `questions` array. It also holds `aiConfig` which dictates how the AI should behave when interacting with respondents.

**Question**
A single step in a form. It tracks the `id`, `type` (from standard text to custom inputs like `mood`), `label`, and optional `logic` arrays which handle branching paths.

**FormResponse**
Tracks an individual submission. It contains a `formId`, an `answers` record mapping question IDs to values, and a `conversationHistory` object that tracks the back-and-forth context if the AI generated follow-ups during the session.

## Main User Flows

**Form Creation Flow**
1. An authenticated user navigates to `CreateFormPage.tsx`.
2. The user inputs a natural language prompt describing the desired form.
3. The component calls `generateFormWithRetry` in `lib/formGenerator.ts`.
4. The request hits the Flask backend, which queries Gemini.
5. The JSON response is parsed into a `FormSchema` and saved to Supabase via `useFormStore`.
6. The user is redirected to the `FormEditor.tsx` or preview screen to make manual adjustments.

**Form Response Flow**
1. A respondent opens a public form link routed to `FormViewPage.tsx`.
2. The UI renders the first question using `QuestionRenderer.tsx`.
3. As the respondent answers, `lib/enhancedFormBrain.ts` evaluates if a dynamic follow-up is needed based on the form's configuration.
4. If a follow-up is triggered, an API call generates a new question on the fly and inserts it into the current view.
5. Upon completion, the final `FormResponse` object is written to Supabase.

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher recommended)
- Python 3.11+
- A Supabase project
- A Google Gemini API key

### Installation

Clone the repository and install the Node dependencies:

```bash
git clone <repository-url>
cd <repository-folder>
npm install
```

Set up the Python backend environment:

```bash
cd backend
python -m venv .venv
# On Windows use: .venv\Scripts\activate
# On Mac/Linux use: source .venv/bin/activate
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file in the project root and another `.env` in the `backend/` folder based on `.env.example`.

**Root `.env` (Frontend)**
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Backend `.env` (Python)**
```env
GEMINI_API_KEY=your_gemini_api_key
FLASK_ENV=development
PORT=5000
```

### Running Locally

You can run both the Vite frontend and the Flask backend concurrently using the provided script from the root directory:

```bash
npm run dev:full
```

Alternatively, run them separately:
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
npm run dev:backend
```

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Vite development server for the React frontend. |
| `npm run dev:backend` | Starts the Python Flask backend server. |
| `npm run dev:full` | Runs both the Vite server and the Flask backend concurrently. |
| `npm run build` | Compiles the React application into static files in the `dist` directory. |
| `npm run preview` | Serves the built production frontend locally for testing. |
| `npm run setup:backend` | Installs Python dependencies in the `backend` folder. |
| `npm run prepare:deploy` | Runs a custom Node script to prep files for deployment. |

## Configuration Notes

- `vite.config.ts`: Configures the Vite build. It specifically sets up path aliases (`@/`) and defines manual chunks for vendor libraries (`react-vendor`, `ui-vendor`, `api-vendor`) to optimize the production build size.
- `tailwind.config.js`: Contains custom animations (`accordion-down`, `accordion-up`) used by the UI components.
- `tsconfig.json`: Standard TypeScript configuration for a Vite React project.

## Testing

Automated tests are partially implemented, as seen in `lib/formGenerator.test.ts`. Currently, the primary method of verification is manual testing.

Realistic future test areas include:
- **Component Tests**: Verifying that `QuestionRenderer.tsx` properly renders different `QuestionType` variations based on mock schema data.
- **State Tests**: Writing unit tests for the Zustand stores to ensure state transitions (like `login` -> `authenticated`) function correctly.
- **Integration Tests**: Mocking the Flask API response to test the form generation pipeline end-to-end without spending Gemini API credits.

## Deployment

The project is structured to deploy the frontend and backend separately.

- **Frontend**: The Vite build outputs static files to the `dist` directory, which can be deployed to Cloudflare Pages, Vercel, or Netlify. The codebase contains a `CLOUDFLARE_PAGES_DEPLOYMENT.md` guide and a `scripts/prepare-deployment.js` script, indicating Cloudflare Pages is the intended target.
- **Backend**: The Flask app (`backend/app.py`) includes configuration for production deployment using `gunicorn`. It can be hosted on services like Render, Heroku, or a standard VPS.
- **Database**: Supabase handles the database and auth layers remotely.

## Future Improvements

- **Database Migrations:** Integrating a proper migration tool for Supabase schema changes rather than relying on manual SQL execution.
- **Input Validation Hardening:** Adding strict Zod validation on the frontend before submitting form responses to the database to ensure data integrity.
- **Unit Testing Coverage:** Expanding the test suite beyond generator testing to cover all edge cases in the conversational follow-up logic.
- **Production CI/CD:** Setting up GitHub Actions to automatically run `npm run lint`, execute tests, and trigger Cloudflare Pages deployments upon merging to the main branch.

## Learning Outcomes

This project demonstrates an understanding of how to bridge modern client-side React architectures with third-party LLM APIs safely. By abstracting the Gemini API behind a Python proxy, it shows practical awareness of security constraints. The use of Zustand for global state and custom TypeScript interfaces (`types.ts`) for complex, deeply nested JSON objects proves an ability to model domain-specific data effectively. Designing a system that allows an AI to dynamically alter a user interface based on previous responses highlights strong problem-solving skills and an understanding of state-driven UI development.

## Screenshots

Screenshots can be added here to show the main dashboards, workflows, and role-specific views once the UI is finalized.

## License

License information has not been specified yet.

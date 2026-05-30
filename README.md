# ⚡ ACTDONE — Premium Todo & Productivity Web App

Actdone is a high-performance, aesthetically stunning, and keyboard-shortcut-driven productivity application designed to help you organize lists, map leveraging activities using the **Eisenhower Priority Matrix**, track focus with **Pomodoro Focus Sessions**, and generate structured breakdown paths using **Gemini AI**.

---

## ✨ Features

- **🏠 Comprehensive Task Management**:
  - Organizable custom lists with specialized categories (Work, Personal, Finance, etc.).
  - Detailed task attributes (starred, due dates, repeat/recurrence patterns, subtasks).
  - Interactive checklists with smooth transitions and animations.
- **📐 Eisenhower Priority Matrix**:
  - Divide tasks into 4 key quadrants: *Urgent & Important* (Do it now), *Not Urgent & Important* (Schedule it), *Urgent & Not Important* (Delegate it), *Not Urgent & Not Important* (Eliminate it).
  - Drag-and-drop orchestration using `@dnd-kit/core` with locked focus rules (max 2 items per quadrant to prevent cognitive overload).
- **⏱️ Focus Mode Sessions**:
  - Select any task to trigger a focused workspace.
  - Interactive timer that logs Pomodoro-style metrics (`focus_sessions`) to analyze your active flow periods.
- **🧠 Smart Subtasks (Gemini AI)**:
  - Generate immediate structural checklists for complex tasks inside the task drawer.
  - Instant batch integration of subtasks into your active list.
- **📊 Analytics Dashboard**:
  - Live 1-year contribution heatmap showing active days.
  - Peak flow analysis (completed tasks broken down by hour).
  - Category completion distribution chart.
- **🎨 Aesthetics & Animations**:
  - curating gorgeous dark/light theme integrations.
  - Micro-animations powered by `Framer Motion` and high-fidelity `Lottie` animations.
- **⚡ Keyboard Shortcut-Driven**:
  - Command spotlight search and shortcut cheat sheet overlays for power users.

---

## ⌨️ Keyboard Shortcuts

Press `Shift + ?` anywhere in the app to view the cheat sheet overlay:

| Shortcut | Action |
| --- | --- |
| `Ctrl / Cmd + K` | Open Command Search Spotlight |
| `Ctrl / Cmd + L` | Create a New Task List |
| `Ctrl / Cmd + D` | Toggle Theme (Dark / Light) |
| `Shift + ?` | Toggle Keyboard Shortcuts Overlay |
| `Escape` | Close modals, search drawers, or panels |

---

## 📂 Repository Structure

```
TODO-WEB-APP/
├── backend/                  # Node.js + Express API Backend
│   ├── sql/schema.sql        # Database Table Schemas
│   ├── src/                  
│   │   ├── config/           # DB connection pools, dotenv config loaders
│   │   ├── controllers/      # Route controllers (Auth, AI, Tasks, Matrix)
│   │   ├── middleware/       # JWT auth filters, error handlers, rate-limiters
│   │   ├── services/         # CTE-optimized database operations
│   │   └── index.js          # Backend API Server Entrypoint
│   └── create-indexes.js     # Automatic Database Performance Indexer
│
├── frontend/                 # React + Vite Frontend SPA
│   ├── src/
│   │   ├── api/              # Axios-based API client wrappers
│   │   ├── assets/           # Premium icons, animations, and logos
│   │   ├── components/       # Component library (Priority Matrix, SideBar, Drawers)
│   │   ├── contexts/         # Context providers (Auth, Theme, Focus Mode, Toast)
│   │   ├── hooks/            # Custom hooks (Keyboard Shortcuts, Audio Synths)
│   │   └── main.jsx          # Frontend React Entrypoint
│   └── index.html
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL Database (Local instance or [Neon DB](https://neon.tech/))

---

### Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file using the configuration parameters:
   ```env
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=your_postgres_database_url
   JWT_SECRET=your_jwt_secret_key
   GEMINI_API_KEY=your_google_gemini_api_key
   CLIENT_URL=http://localhost:5173
   ```
4. **Optimize & Index Database**:
   Run the zero-touch migration script to automatically create database performance tables and critical query indexes (Local and Neon Production):
   ```bash
   node create-indexes.js
   ```
5. Start the backend developer API server:
   ```bash
   npm run dev
   ```

---

### Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite developer server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173` to explore your productivity center!

---

## 🔒 Security & Performance Optimizations

- **Atomic Queries (CTEs)**: Database services utilize Common Table Expressions (CTEs) to consolidate multi-statement transaction queries into single database actions, reducing sequential internet round-trips from up to 5 down to exactly 1.
- **Performance Indexes**: Missing foreign key constraints and `deleted_at IS NULL` indices are fully indexed to avoid full-table scans.
- **Snappy Delete UX**: Visual task deletion triggers instant toasts using optimistic state updates, syncing database deletions seamlessly in the background.
- **Autofocus Inputs**: Dynamic effects focus keyboard inputs by default when opening editors, simplifying entry across mobile and desktop.

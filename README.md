# 📝 Notes App — MERN Full-Stack

A full-stack Notes application built with the **MERN** stack (MongoDB, Express, React, Node.js). It allows authenticated users to create, read, update, and delete personal notes via a RESTful API consumed by a React frontend.

---

## 🛠️ Tech Stack

| Layer      | Technology                         |
|------------|------------------------------------|
| Runtime    | Node.js                            |
| Web Server | Express.js                         |
| Database   | MongoDB (Mongoose ODM)             |
| Frontend   | React 19 + Vite                    |
| Routing    | React Router v7                    |
| Logging    | Pino                               |
| Testing    | Mocha / Chai (backend), Jest (frontend) |
| Code Quality | SonarQube                        |
| Version Control | Git                           |

---

## 📁 Folder Structure

```
cohort-9-mern-15099-tahira/
├── backend/
│   ├── src/
│   │   ├── config/          # DB connection & app config
│   │   ├── controllers/     # Route handler logic
│   │   ├── middlewares/     # Auth, error handling, validation
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # Express routers
│   │   ├── services/        # Business logic layer
│   │   └── utils/           # Helpers & utilities
│   ├── tests/               # Mocha/Chai test files
│   ├── .env.example         # Environment variable template
│   ├── .gitignore
│   ├── package.json
│   └── server.js            # Express entry point
│
├── frontend/
│   ├── src/
│   │   ├── assets/          # Static assets (images, icons)
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React Context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Route-level page components
│   │   └── services/        # API call abstractions (Axios)
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore               # Root-level (covers both workspaces)
└── README.md
```

---

## 🌿 Branching Strategy

| Branch          | Purpose                                              |
|-----------------|------------------------------------------------------|
| `main`          | Production-ready, stable code only                   |
| `develop`       | Integration branch — all features merged here first  |
| `feature/*`     | Individual feature branches (`feature/auth`, etc.)   |
| `fix/*`         | Bug-fix branches (`fix/login-error`, etc.)           |

**Workflow:**
1. Branch off `develop` → `feature/<name>` or `fix/<name>`
2. Open a Pull Request → `develop`
3. After QA + review, merge `develop` → `main` for release

---

## 🚀 Local Setup

### Prerequisites
- Node.js ≥ 18
- MongoDB (local or Atlas)
- npm ≥ 9

### Backend

```bash
# 1. Navigate to backend
cd backend

# 2. Copy env template and fill in values
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Start development server (with hot reload)
npm run dev

# 5. Run tests
npm test
```

The API will be available at `http://localhost:5000`.  
Health check: `GET http://localhost:5000/health`

### Frontend

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start Vite dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 🤝 Contributing

Please create a branch from `develop`, follow the naming conventions above, and open a Pull Request for review before merging.

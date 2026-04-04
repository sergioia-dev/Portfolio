# AGENTS.md - Portfolio Project

Agentic coding guidelines for this repository.

## Project Structure

```
/home/k1/Projects/Portfolio/
├── front-end/      # React 19 + Vite (client)
└── back-end/       # Express 5 + TypeScript (API)
```

---

## Build Commands

### Front-end

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| **Single test:** No test framework configured. |

### Back-end

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (dev mode) |
| `npm run build` | Compile TypeScript |
| `npm run start` | Run production build |
| `npm run migrate:make <name>` | Create migration |
| `npm run migrate:latest` | Run migrations |
| `npm run migrate:rollback` | Rollback last migration |
| `npm run migrate:status` | Check migration status |
| `npm run seeds:run` | Run seed files |
| **Single test:** No test framework configured. |

---

## Code Style Guidelines

### General

- **No comments** unless explicitly required
- Use descriptive names for variables and functions
- Keep functions small and focused
- Handle errors explicitly with try/catch blocks

### Front-end (React + JSX)

**Imports:**
```jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/pagesBundle.jsx";
import { useStorageState } from "./states/states.jsx";
import { API_URL } from "./configuration/environment.js";
```

- Use double quotes for strings (`"string"`)
- Use `.jsx` extension for React components
- Use named exports for page bundles and state hooks
- Import React explicitly at the top

**Naming Conventions:**
- Components: `PascalCase` (e.g., `HomePage`, `StaticAside`)
- Functions/variables: `camelCase` (e.g., `handleTheme`, `useStorageState`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `API_URL`, `BLOGS_SUBURL`)
- Files: `camelCase` with descriptive names (e.g., `states.jsx`, `blogsBundle.jsx`)

**Component Structure:**
```jsx
function ComponentName({ prop1, prop2 }) {
  const [state, setState] = React.useState(initialValue);
  
  const handleAction = () => {
    // handler code
  };
  
  return (
    <element>
      {/* JSX content */}
    </element>
  );
}

export default ComponentName;
```

**State Management:**
- Use `useStorageState` hook for persisting state to localStorage
- Use `useFetchData` pattern with action types: `FETCH_INIT`, `FETCH_SUCCESS`, `FETCH_FAILURE`

**Error Handling:**
- Use try/catch in async operations
- Return appropriate HTTP status codes (400, 404, 500)
- Log errors with `console.error`

---

### Back-end (Express + TypeScript)

**File Organization:**
```
src/
├── controller/    # Request handlers
├── repository/    # Database queries
├── route/         # Route definitions
├── configuration/ # Environment & middleware
├── database/     # Migrations & seeds
└── util/          # Utility functions
```

**Naming Conventions:**
- Files: `snake_case` (e.g., `blogs_controller.ts`, `blog_routes.ts`)
- Functions: `camelCase`
- Interfaces/Types: `PascalCase`
- Database tables: `snake_case` (e.g., `blog_tags`, `projects`)

**TypeScript Guidelines:**
- Enable `strict: true` in tsconfig.json
- Use explicit types for function parameters and return values
- Use `string | null` for nullable query parameters

**Imports:**
```typescript
import { RequestHandler } from "express";
import { getBlogsByLang } from "../repository/blogs_repository";
```

**Error Handling:**
```typescript
try {
  // operation
} catch (error) {
  console.error("!!! Error message :\n", error);
  response.status(500).json({ message: "Internal Server Error" });
}
```

**Controller Pattern:**
- Each route has a dedicated controller file
- Controllers handle request validation, parsing, and response formatting
- Repository handles database operations

---

## Database

- **ORM**: Knex.js with PostgreSQL
- Migrations in `src/database/migrations/`
- Seeds in `src/database/seeds/`
- Run migrations before running seeds for fresh data

---

## API Endpoints

Base URL configured in `environment.js` / `environment.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/blogs` | GET | Fetch blogs by language |
| `/blogs?lang=&match=` | GET | Search blogs |
| `/blogs?lang=&tag=` | GET | Filter by tag |
| `/projects` | GET | Fetch projects |
| `/tags` | GET | Fetch all tags |

---

## Notes

- Both projects use separate `node_modules` - run `npm install` in each directory
- No existing .cursorrules or Copilot rules found
- No test frameworks configured in either project

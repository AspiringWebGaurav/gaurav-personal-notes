# GPN Enterprise Architecture Documentation

## Core Architectural Principles

1. **Vertical Slices (Feature-Driven Design)**
   Instead of organizing by technical concerns (e.g., all models together, all controllers together), the codebase is organized by business features (`auth`, `notes`, `dashboard`, `collaboration`).

2. **Clean Data Layer (Repository Pattern)**
   UI components do not interact directly with Firebase or external APIs. They interface with Repository classes or Hooks that internally manage the Firebase SDK. This allows for easier testing, caching, and future migration.

3. **Strict Validation**
   All data entering the application from Firebase or user input is validated using `Zod` schemas to guarantee runtime type safety.

## System Architecture

### 1. Authentication Domain
* **Provider**: Firebase Auth (Google OAuth).
* **State Management**: `useAuth` hook powered by Zustand to maintain global session state.
* **Component**: `AuthProvider` wraps the application to ensure the user is resolved before rendering protected routes.

### 2. Data Layer Domain
* **Firebase Services**: Abstracted via `src/core/services/firebase.ts`.
* **Repositories**:
  * `NotesRepository`: Handles CRUD operations for notes.
  * `UserRepository`: Handles profile and preference updates.

### 3. Notes Domain
* **Editor**: Tiptap v2 (headless wrapper).
* **State Sync**: Yjs is used to represent the document state. Offline caching stores the Yjs update vectors in IndexedDB.

### 4. Collaboration Domain
* **Signaling**: Lobbies are managed via Firestore.
* **WebRTC / Firestore Sync**: Yjs uses WebRTC for peer-to-peer fast syncing and Firestore as a fallback persistent storage layer.

## Project Structure

```text
src/
├── app/                  # Next.js App Router (Pages, Layouts, API Routes)
├── core/                 # Shared infrastructure and enterprise logic
│   ├── config/           # Environment and App configs
│   └── services/         # Third-party integrations (Firebase)
├── features/             # Vertical business domains
│   ├── auth/             # Login, Session Management
│   ├── notes/            # Editor, Note Lists, Sync
│   └── dashboard/        # Global Layout, Navigation
├── shared/               # Code shared across all features
│   ├── components/       # UI Library (Radix/Shadcn)
│   ├── hooks/            # Generic hooks (useDebounce, useMediaQuery)
│   └── lib/              # Utilities (utils.ts)
```

## Security Posture
* **Firestore Rules**: Strict path-matching ensuring users can only read/write documents inside their `users/{uid}` path.
* **RTDB Rules**: Presence nodes are strictly bound to the authenticated user's UID.
* **Client Validation**: Zod ensures no malformed data is written to Firestore.

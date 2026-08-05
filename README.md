# Realtime Board Manager

A real-time collaborative board management application — Mini Trello App built for Coding Challenge #5.

## Tech Stack

**Frontend**
- React 19 + TypeScript + Vite
- Tailwind CSS (Corporate Trust design system)
- TanStack Query, React Hook Form, Zod
- React DnD (drag & drop), Socket.IO Client
- Zustand (state management)

**Backend**
- Node.js + Express.js + TypeScript
- Firebase Firestore (database)
- Socket.IO (real-time)
- Nodemailer (email OTP)
- Octokit (GitHub API)
- JWT authentication

## Features

- ✅ Passwordless auth (email OTP)
- ✅ GitHub OAuth integration
- ✅ Board / Card / Task CRUD
- ✅ Drag & drop tasks across Kanban columns (Icebox → Backlog → Ongoing → Review → Done)
- ✅ Real-time sync via Socket.IO
- ✅ Invite members via email
- ✅ Attach GitHub PRs / Issues / Commits to tasks
- ✅ JWT protected API

## Getting Started

### Requirements

- Node.js 22+
- Firebase project
- GitHub OAuth App
- Gmail account (SMTP)

### Setup

```bash
# Clone
git clone https://github.com/nguyentrungcongduong/realtime-board-manager.git
cd realtime-board-manager

# Server
cd server
cp .env.example .env   # fill in your values
npm install
npm run dev            # runs on :5000

# Client (new terminal)
cd client
cp .env.example .env
npm install
npm run dev            # runs on :5173
```

### Environment Variables

See [`server/.env.example`](./server/.env.example) and [`client/.env.example`](./client/.env.example).

## Project Structure

```
realtime-board-manager/
├── client/              # React frontend
│   └── src/
│       ├── api/         # Axios instance
│       ├── pages/       # LoginPage, BoardsPage, BoardDetailPage
│       ├── layouts/     # AuthLayout, AppLayout
│       ├── services/    # API service functions
│       ├── socket/      # Socket.IO client
│       ├── store/       # Zustand auth store
│       ├── types/       # TypeScript interfaces
│       └── utils/       # Helper functions
│
└── server/              # Express backend
    └── src/
        ├── config/      # Firebase, env validation
        ├── controllers/ # HTTP request handlers
        ├── services/    # Business logic
        ├── repositories/# Firestore queries
        ├── routes/      # API route definitions
        ├── middleware/  # Auth, error handlers
        ├── sockets/     # Socket.IO setup
        ├── models/      # TypeScript interfaces
        └── utils/       # JWT, OTP, response helpers
```

# Gamblor

A full-stack web application for playing a social baseball prediction game where groups of friends compete by making picks on baseball outcomes, track winnings/losses, and compete for bragging rights.

## Tech Stack

**Frontend**
- Next.js 15 with React 19
- TypeScript
- Tailwind CSS + Radix UI / shadcn components
- React Hook Form + Zod validation

**Backend**
- FastAPI (Python 3.11+)
- PostgreSQL 16 with SQLAlchemy / SQLModel
- Alembic migrations
- JWT authentication with Google OAuth

**Infrastructure**
- Docker + Docker Compose

## Features

- **Game Creation** - Create games with configurable rules (ante amount, adjudication mode, MLB game ID)
- **Game Joining** - Players join via 6-digit PIN
- **Game Lobby** - Waiting area before game starts
- **Predictions** - Players make picks (K, G, F, D, T, N) representing baseball outcomes
- **Inning Tracking** - Track multiple innings with top/bottom halves and outs
- **Pick Amendments** - Change picks with a $2 fee
- **Ledger System** - Track antes, wins, losses, and fees
- **Statistics** - Per-game and lifetime user stats
- **Google OAuth** - Sign in with Google

## Project Structure

```
gamblor-app/
├── frontend/              # Next.js application
│   ├── src/
│   │   ├── app/           # Pages and routes
│   │   ├── components/    # React components
│   │   └── lib/           # Utilities and API clients
│   └── package.json
├── backend/               # FastAPI application
│   ├── routers/           # API route handlers
│   ├── models.py          # Database models
│   ├── auth.py            # Authentication logic
│   ├── alembic/           # Database migrations
│   └── pyproject.toml
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker and Docker Compose
- pnpm (for frontend)
- uv (for backend)

### Database Setup

Start the PostgreSQL database:

```bash
docker-compose up db
```

### Backend Setup

```bash
cd backend

# Install dependencies
uv sync

# Run database migrations
uv run alembic upgrade head

# (Optional) Seed with sample data
python run_seed.py

# Start the server
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at http://localhost:8000 with docs at http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

The app will be available at http://localhost:3000

### Running Everything with Docker

```bash
docker-compose up
```

## Environment Variables

### Backend

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |

### Frontend

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID |

## API Endpoints

- `GET /health` - Health check
- `POST /auth/google` - Exchange Google token for JWT
- `GET /auth/me` - Get current user
- `GET /users` - List users
- `POST /games` - Create a game
- `GET /games/{pin}` - Get game by PIN
- `POST /games/{pin}/join` - Join a game

Full API documentation available at `/docs` when running the backend.

## License

MIT

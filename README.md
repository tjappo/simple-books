# Full-Stack Application with Auth0

A modern full-stack application built with React 19, NestJS, PostgreSQL, and Auth0 OIDC authentication.

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible component primitives
- **React Router v7** - Routing
- **Motion One** - Micro-animations
- **Axios** - HTTP client
- **Zod** - Schema validation
- **Luxon** - Date formatting

### Backend
- **NestJS** - Node.js framework
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **express-openid-connect** - OIDC authentication
- **express-session** - Session management
- **@nestjs/serve-static** - Static file serving
- **Auth0** - Identity provider

## Project Structure

```
.
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   ├── src/
│   │   ├── auth/               # OIDC auth guards
│   │   ├── prisma/             # Prisma service
│   │   ├── users/              # Users module
│   │   ├── app.module.ts       # Root module (includes ServeStaticModule)
│   │   └── main.ts             # Application entry point (OIDC config)
│   ├── .env.example            # Environment variables template
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/         # Reusable components
    │   ├── contexts/           # React contexts (Auth)
    │   ├── pages/              # Page components
    │   ├── lib/                # Utilities & configurations
    │   ├── App.tsx             # Main app component
    │   └── main.tsx            # Application entry point
    ├── .env.example            # Environment variables template
    └── package.json
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (or npm/yarn)
- PostgreSQL database
- Auth0 account

### 1. Set up Auth0

1. Create an Auth0 account at https://auth0.com
2. Create a new **Regular Web Application** in Auth0 Dashboard
3. Note down:
   - Domain (e.g., `your-tenant.auth0.com`)
   - Client ID
   - Client Secret

#### Auth0 Application Settings

- **Allowed Callback URLs**: `http://localhost:3000/auth/callback`
- **Allowed Logout URLs**: `http://localhost:3000`
- **Application Type**: Regular Web Application

### 2. Generate Secrets

```bash
# Generate SESSION_SECRET
openssl rand -hex 32

# Generate AUTH0_SECRET
openssl rand -hex 32
```

### 3. Set up the Backend

```bash
cd backend

# Copy environment variables
cp .env.example .env

# Edit .env and add your configuration:
# - DATABASE_URL: Your PostgreSQL connection string
# - AUTH0_ISSUER_URL: Your Auth0 domain (e.g., https://your-tenant.auth0.com/)
# - AUTH0_CLIENT_ID: Your Auth0 client ID
# - AUTH0_SECRET: Generated secret from step 2
# - SESSION_SECRET: Generated secret from step 2
# - BASE_URL: http://localhost:3000

# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma:generate

# Run database migration
pnpm prisma:migrate
```

### 4. Set up the Frontend

```bash
cd frontend

# Copy environment variables
cp .env.example .env

# Edit .env (leave VITE_API_URL empty for production mode)
# - VITE_API_URL: Leave empty (uses relative URLs)

# Install dependencies
pnpm install

# Build the frontend
pnpm build
```

### 5. Start the Application

```bash
cd backend

# Start the development server (serves both API and frontend)
pnpm start:dev
```

The application will be available at `http://localhost:3000`

## Development Modes

### Production Mode (Default)
Frontend is built and served through NestJS:
```bash
# Build frontend
cd frontend && pnpm build

# Start backend (serves both API and frontend)
cd backend && pnpm start:dev
```
Access at: `http://localhost:3000`

### Separate Development Mode
For frontend hot-reload during development:
```bash
# Terminal 1 - Backend
cd backend
# Set FRONTEND_URL in .env to enable CORS
pnpm start:dev

# Terminal 2 - Frontend
cd frontend
# Set VITE_API_URL=http://localhost:3000 in .env
pnpm dev
```
Frontend: `http://localhost:5173`, Backend: `http://localhost:3000`

## Available Scripts

### Backend

- `pnpm start:dev` - Start development server with hot-reload
- `pnpm start:prod` - Start production server
- `pnpm build` - Build for production
- `pnpm prisma:generate` - Generate Prisma client
- `pnpm prisma:migrate` - Run database migrations
- `pnpm prisma:studio` - Open Prisma Studio (database GUI)

### Frontend

- `pnpm dev` - Start development server (separate mode)
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint

## Features

### Authentication
- OIDC authentication with Auth0
- Server-side session management
- Protected routes
- Automatic login/logout flows
- User profile management

### Architecture
- Frontend served through NestJS (single server)
- Static file serving with @nestjs/serve-static
- API routes prefixed with `/api`
- Auth routes: `/auth/login`, `/auth/logout`, `/auth/callback`

### Database
- User model with Auth0 integration
- Automatic user creation on first login
- PostgreSQL with Prisma ORM

### UI Components
- Responsive design with Tailwind CSS
- Accessible components with Radix UI
- Smooth micro-animations with Motion One
- Loading states and error handling

### API
- RESTful endpoints
- Session-based authentication
- CORS configuration for separate dev mode
- User profile endpoint (`GET /api/users/me`)

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/mydb?schema=public"

# Auth0 OIDC Configuration
AUTH0_ISSUER_URL="https://your-tenant.auth0.com/"
AUTH0_CLIENT_ID="your-client-id"
AUTH0_SECRET="generate-with-openssl-rand-hex-32"

# Session Configuration
SESSION_SECRET="generate-with-openssl-rand-hex-32"

# Application
PORT=3000
BASE_URL="http://localhost:3000"
# Set FRONTEND_URL only for separate frontend development (enables CORS)
FRONTEND_URL=""
```

### Frontend (.env)

```env
# API Configuration
# Leave empty when frontend is served through NestJS (uses relative URLs)
# Set to http://localhost:3000 for separate frontend development with dev server
VITE_API_URL=
```

## API Endpoints

### Auth Endpoints (provided by express-openid-connect)
- `GET /auth/login` - Redirects to Auth0 login
- `GET /auth/logout` - Logs out and redirects to Auth0 logout
- `GET /auth/callback` - Auth0 callback (handled automatically)

### Public Endpoints
None (all API endpoints require authentication)

### Protected Endpoints

#### `GET /api/users/me`
Get current user profile

**Authentication:** Requires active session (cookie-based)

**Response:**
```json
{
  "id": "uuid",
  "auth0Id": "auth0|...",
  "email": "user@example.com",
  "name": "John Doe",
  "picture": "https://...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Database Schema

### User Model

```prisma
model User {
  id        String   @id @default(uuid())
  auth0Id   String   @unique
  email     String   @unique
  name      String?
  picture   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}
```

## Production Deployment

### Full Application Deployment

1. **Set up Auth0 for Production:**
   - Update Allowed Callback URLs: `https://yourdomain.com/auth/callback`
   - Update Allowed Logout URLs: `https://yourdomain.com`

2. **Configure Environment Variables:**
   ```bash
   # Backend .env
   DATABASE_URL="your-production-database-url"
   AUTH0_ISSUER_URL="https://your-tenant.auth0.com/"
   AUTH0_CLIENT_ID="your-client-id"
   AUTH0_SECRET="production-secret"
   SESSION_SECRET="production-session-secret"
   PORT=3000
   BASE_URL="https://yourdomain.com"
   FRONTEND_URL=""  # Leave empty in production
   NODE_ENV="production"
   ```

3. **Build and Deploy:**
   ```bash
   # Build frontend
   cd frontend
   pnpm build

   # Deploy backend (includes frontend dist)
   cd backend
   pnpm prisma:migrate deploy
   pnpm build
   pnpm start:prod
   ```

### Important Notes for Production

- Use HTTPS for all production URLs
- Generate secure secrets (64+ characters)
- Enable secure cookies in production (automatic when NODE_ENV=production)
- Use connection pooling for PostgreSQL
- Consider using a session store (Redis) for horizontal scaling
- Set up proper logging and monitoring

## Troubleshooting

### Auth0 Issues

- **Callback URL mismatch:** Ensure `http://localhost:3000/auth/callback` is in Allowed Callback URLs
- **Login redirect fails:** Verify AUTH0_CLIENT_ID and AUTH0_SECRET are correct
- **Session not persisting:** Check SESSION_SECRET is set and cookies are enabled

### Database Issues

- Ensure PostgreSQL is running
- Check DATABASE_URL format
- Run `pnpm prisma:generate` after schema changes

### CORS Issues (Separate Dev Mode)

- Set FRONTEND_URL in backend .env when using separate dev servers
- Verify the frontend dev server URL matches FRONTEND_URL

### Session Issues

- Clear browser cookies if experiencing auth issues
- Ensure SESSION_SECRET is properly set
- Check that cookies are not blocked by browser

## License

MIT

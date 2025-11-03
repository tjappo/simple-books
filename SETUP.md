# Quick Setup Guide

## Step 1: Auth0 Configuration

1. Go to https://auth0.com and create/login to your account

2. **Create a Regular Web Application:**
   - Navigate to Applications → Create Application
   - Choose "Regular Web Applications"
   - Name it (e.g., "Bookkeeping App")
   - Note down the **Domain**, **Client ID**, and **Client Secret**

3. **Configure Application Settings:**
   - Allowed Callback URLs: `http://localhost:3000/auth/callback`
   - Allowed Logout URLs: `http://localhost:3000`
   - Save changes

## Step 2: Generate Secrets

1. **Generate SESSION_SECRET:**
   ```bash
   openssl rand -hex 32
   ```
   Copy the output - you'll need this

2. **Generate AUTH0_SECRET:**
   ```bash
   openssl rand -hex 32
   ```
   Copy the output - you'll need this too

## Step 3: Database Setup

1. **Install PostgreSQL** if not already installed:
   - macOS: `brew install postgresql`
   - Ubuntu: `sudo apt-get install postgresql`
   - Windows: Download from postgresql.org

2. **Create a database:**
   ```bash
   # Start PostgreSQL (if not running)
   # macOS: brew services start postgresql
   # Linux: sudo service postgresql start

   # Create database
   createdb bookkeeping
   ```

3. **Get your connection string:**
   ```
   postgresql://username:password@localhost:5432/bookkeeping?schema=public
   ```
   - Default PostgreSQL username is usually `postgres`
   - If no password is set, you might need to set one

## Step 4: Backend Setup

```bash
cd backend

# Copy and configure environment variables
cp .env.example .env

# Edit .env file with your values:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/bookkeeping?schema=public"
# AUTH0_ISSUER_URL="https://your-tenant.auth0.com/"
# AUTH0_CLIENT_ID="your-client-id-from-auth0"
# AUTH0_SECRET="paste-generated-secret-from-step-2"
# SESSION_SECRET="paste-generated-session-secret-from-step-2"
# BASE_URL="http://localhost:3000"
# PORT=3000
# FRONTEND_URL="" (leave empty)

# Install dependencies
pnpm install

# Generate Prisma Client
pnpm prisma:generate

# Create database tables
pnpm prisma:migrate
```

## Step 5: Frontend Setup

```bash
cd frontend

# Copy and configure environment variables
cp .env.example .env

# Edit .env file (leave VITE_API_URL empty):
# VITE_API_URL=

# Install dependencies
pnpm install

# Build the frontend
pnpm build
```

## Step 6: Start the Application

```bash
cd backend

# Start the server (serves both API and frontend)
pnpm start:dev
```

✅ Application should now be running at http://localhost:3000

## Step 7: Test the Application

1. Open http://localhost:3000 in your browser
2. Click "Sign In"
3. Complete the Auth0 authentication
4. You should be redirected back and logged in
5. Navigate to Dashboard to see your profile data from the database

## Alternative: Separate Development Mode

If you want frontend hot-reload during development:

1. **Terminal 1 - Backend:**
   ```bash
   cd backend
   # Set FRONTEND_URL=http://localhost:5173 in .env
   pnpm start:dev
   ```

2. **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   # Set VITE_API_URL=http://localhost:3000 in .env
   pnpm dev
   ```

3. Access frontend at http://localhost:5173

## Common Issues

### Auth0 Errors

**Error: `redirect_uri` mismatch**
- Make sure `http://localhost:3000/auth/callback` is in Allowed Callback URLs in Auth0
- Verify you created a "Regular Web Application" not a SPA

**Error: Login fails immediately**
- Check AUTH0_CLIENT_ID and AUTH0_SECRET are correct
- Verify AUTH0_ISSUER_URL ends with a trailing slash

**Error: Session not persisting**
- Ensure SESSION_SECRET is set
- Clear browser cookies and try again

### Database Errors

**Error: Can't connect to database**
- Make sure PostgreSQL is running
- Check your DATABASE_URL format
- Verify username and password

**Error: Relation does not exist**
- Run `pnpm prisma:migrate` in the backend directory

### Build Errors

**Error: Cannot GET /**
- Make sure you've built the frontend: `cd frontend && pnpm build`
- Verify the backend is serving from the correct path

### CORS Errors (Separate Dev Mode only)

**Error: CORS policy blocking request**
- Make sure FRONTEND_URL in backend .env is set to `http://localhost:5173`
- Verify both frontend and backend servers are running

## Environment Variables Reference

### Backend `.env`
```env
DATABASE_URL="postgresql://username:password@localhost:5432/bookkeeping?schema=public"
AUTH0_ISSUER_URL="https://your-tenant.auth0.com/"
AUTH0_CLIENT_ID="your-client-id"
AUTH0_SECRET="generated-secret"
SESSION_SECRET="generated-session-secret"
BASE_URL="http://localhost:3000"
PORT=3000
FRONTEND_URL="" # Leave empty for production mode
```

### Frontend `.env`
```env
VITE_API_URL= # Leave empty for production mode
```

## Next Steps

- Explore the code structure in `README.md`
- Add new database models in `backend/prisma/schema.prisma`
- Create new API endpoints in `backend/src/`
- Build new UI components in `frontend/src/components/`
- Add new pages in `frontend/src/pages/`

## Need Help?

- Auth0 Docs: https://auth0.com/docs
- NestJS Docs: https://docs.nestjs.com
- Prisma Docs: https://www.prisma.io/docs
- React Router Docs: https://reactrouter.com
- Tailwind CSS Docs: https://tailwindcss.com/docs

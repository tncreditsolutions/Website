# TN Credit Solutions

## Overview

TN Credit Solutions is a professional financial services web application offering credit restoration and tax optimization services. Built as a modern single-page application, it features a marketing-focused landing page with contact form submission, client testimonials, and service information. The application uses a full-stack TypeScript architecture with React frontend and Express backend, designed to build trust and convert visitors into clients through a clean, professional interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## Current Status

**Deployment Ready:** ✅ YES

The application is fully tested and production-ready for deployment to Railway with a custom domain.

### Recent Implementations
- **Database-Backed User Storage:** Admin credentials (username, password) now persist in PostgreSQL using Drizzle ORM
- **Secure Password Management:** Passwords are hashed with bcrypt, password changes persist across restarts
- **Complete Admin Authentication:** Login, logout, and password change features fully functional
- **AI-Powered Chat Agent:** Riley AI assistant analyzes credit reports using OpenAI's gpt-4o vision API
- **PDF Generation:** Automatic credit analysis PDF generation with visitor timezone support for accurate dates
- **Admin Dashboard:** Complete dashboard for managing contact submissions, live chat, uploaded documents, and newsletter subscriptions

## Deployment Requirements

### Environment Variables (Must be set on Railway)
- `DATABASE_URL` - PostgreSQL connection string (Neon serverless)
- `OPENAI_API_KEY` - OpenAI API key for AI chat functionality
- `SESSION_SECRET` - Secret key for session encryption (generate a strong random string)
- `NODE_ENV` - Set to "production"

### Initial Setup After Deployment
1. Default admin user is created automatically on first startup with:
   - Username: `admin`
   - Password: `admin123`
2. **IMPORTANT:** After deployment, immediately login to `/admin` and change this password to something secure

### Custom Domain Configuration
1. Add your custom domain to Railway project settings
2. Update your domain's DNS records to point to Railway
3. The app will automatically use HTTPS with Railway's managed SSL

## System Architecture

### Frontend Architecture

**Framework & Tooling**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast hot module replacement
- Wouter for lightweight client-side routing (single home route)
- TanStack Query (React Query) for server state management and API calls

**UI Component System**
- shadcn/ui component library (New York style variant) providing pre-built, accessible components
- Radix UI primitives as the foundation for interactive components (dialogs, dropdowns, accordions, etc.)
- Tailwind CSS for utility-first styling with custom design tokens
- CSS variables for theme customization (light mode configured, dark mode infrastructure present)

**Design System**
- Typography: Inter/DM Sans Google Fonts for professional financial services aesthetic
- Color palette: Neutral-based with primary blue (HSL 217 91% 45%) for trust and credibility
- Spacing: Consistent Tailwind units (4, 6, 8, 12, 16, 20) throughout
- Component hierarchy: Card-based layout with elevation shadows for depth

**Page Structure**
The home page follows a 6-7 section marketing layout:
1. Hero section with full-width background image and dual CTAs
2. Services overview with two-column grid (Credit Restoration + Tax Maximization)
3. "How It Works" three-step process with visual timeline
4. Social proof section with statistics and client testimonials
5. Contact form with service selection and submission
6. FAQ accordion for common questions
7. Footer with newsletter signup and social links

All sections scroll smoothly via anchor navigation, creating a single-page experience optimized for conversion.

### Backend Architecture

**Server Framework**
- Express.js with TypeScript for type-safe API development
- Dual entry points: `index-dev.ts` (Vite middleware integration) and `index-prod.ts` (static file serving)
- RESTful API design with `/api` prefix for all endpoints

**Data Storage**
- **User Storage:** PostgreSQL with Drizzle ORM (for persistent admin credentials)
- **Other Data:** In-memory storage for contact submissions, chat messages, documents, and newsletter subscriptions
- Storage interface (`IStorage`) designed for easy expansion to full database implementation

**API Endpoints**
- `POST /api/auth/login` - Admin login with username/password
- `POST /api/auth/logout` - Logout and destroy session
- `POST /api/auth/change-password` - Change admin password (authenticated)
- `GET /api/auth/check` - Check authentication status
- `POST /api/contact` - Submit contact form
- `GET /api/contact` - Retrieve all contact submissions (admin only)
- `POST /api/chat` - Send chat message
- `GET /api/chat` - Retrieve all chat messages
- `POST /api/documents/upload` - Upload credit report document
- `GET /api/documents` - List all documents (admin only)
- `GET /api/documents/{id}/view` - View document details

**Request Handling**
- JSON body parsing with raw body preservation
- Request logging middleware with timing and response capture
- Error handling with appropriate HTTP status codes and JSON error responses
- Session middleware with 24-hour expiration

### Data Storage Solutions

**User Credentials (PostgreSQL)**
- Admin username and password stored securely in PostgreSQL
- Passwords hashed with bcrypt (10 rounds)
- Database-backed storage ensures credentials persist across app restarts
- Changes to password are immediately saved to database

**Other Data (In-Memory)**
- Contact submissions: id, name, phone, email, service, referral, message, createdAt
- Chat messages: id, name, email, message, sender, isEscalated, createdAt
- Documents: id, visitorEmail, visitorName, fileName, fileType, filePath, aiAnalysis, status, pdfPath, visitorTimezone, visitorDateForFilename, createdAt
- Newsletter subscriptions: id, email, createdAt

**Schema**
- Drizzle ORM for type-safe database queries
- Zod schemas generated from Drizzle table definitions via `drizzle-zod`
- Shared types between client and server for type safety

### Authentication & Authorization

**Implemented Features**
- Password-based authentication with secure bcrypt hashing (10 rounds)
- Session-based authentication using Express sessions with 24-hour expiration
- Secure HTTP-only cookies with secure flag enabled in production
- Session SECRET stored as environment variable (never exposed in code)
- Authentication middleware protecting admin routes

**Admin Access**
- Protected `/admin` route requires authentication
- Default admin credentials auto-created on first startup (must be changed)
- Password changes immediately persist to database
- Logout clears session and destroys cookie

### External Dependencies

**Third-Party UI Libraries**
- shadcn/ui: Comprehensive component library built on Radix UI
- Radix UI: Unstyled, accessible component primitives (20+ components)
- Lucide React: Icon system for consistent visual language
- Embla Carousel: Touch-friendly carousel/slider component
- cmdk: Command palette component (infrastructure present)

**Styling & Utilities**
- Tailwind CSS: Utility-first CSS framework
- class-variance-authority: Type-safe variant API for components
- clsx & tailwind-merge: Conditional className utilities
- PostCSS with Autoprefixer for vendor prefixing

**Data Management**
- TanStack Query v5: Server state management, caching, and synchronization
- React Hook Form: Form state management with validation
- Zod: TypeScript-first schema validation
- date-fns: Date manipulation and formatting

**Database & ORM**
- Drizzle ORM: TypeScript ORM for PostgreSQL
- @neondatabase/serverless: Serverless PostgreSQL client
- drizzle-zod: Generate Zod schemas from Drizzle tables

**Security**
- bcrypt: Password hashing with salt rounds
- express-session: Session management
- Session store in memory (for admin sessions)

**Development Tools**
- Vite: Build tool with HMR and optimized production builds
- TypeScript: Type safety across frontend and backend
- ESBuild: Fast bundling for production server build
- tsx: TypeScript execution for development server

**Replit-Specific**
- @replit/vite-plugin-runtime-error-modal: Error overlay in development
- @replit/vite-plugin-cartographer: Code navigation enhancement
- @replit/vite-plugin-dev-banner: Development environment indicator

## Key Files

- `server/app.ts` - Express server configuration and middleware
- `server/routes.ts` - API route definitions and business logic
- `server/storage.ts` - Database storage implementation using Drizzle ORM
- `shared/schema.ts` - Database schema definitions
- `client/src/pages/Home.tsx` - Public landing page
- `client/src/pages/Admin.tsx` - Secure admin dashboard
- `client/src/pages/Login.tsx` - Admin login form
- `client/src/components/ChatWidget.tsx` - AI chat widget for public
- `client/src/App.tsx` - Main React component with routing

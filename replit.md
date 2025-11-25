# TN Credit Solutions

## Overview

TN Credit Solutions is a professional financial services web application offering credit restoration and tax optimization services. Built as a modern single-page application, it features a marketing-focused landing page with contact form submission, client testimonials, and service information. The application uses a full-stack TypeScript architecture with React frontend and Express backend, designed to build trust and convert visitors into clients through a clean, professional interface.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- In-memory storage implementation (`MemStorage` class) for development and demo purposes
- Storage interface (`IStorage`) designed for easy swapping to database implementation
- Prepared for PostgreSQL via Drizzle ORM (configuration present, not yet implemented)

**API Endpoints**
- `POST /api/contact` - Submit contact form (validated with Zod schema)
- `GET /api/contact` - Retrieve all contact submissions (admin functionality)

**Request Handling**
- JSON body parsing with raw body preservation for webhook verification
- Request logging middleware with timing and response capture
- Error handling with 400/500 status codes and JSON error responses

### Data Storage Solutions

**Current Implementation**
- Map-based in-memory storage for users and contact submissions
- UUID generation for unique record IDs
- Automatic timestamp creation for submissions

**Planned Database Architecture**
- PostgreSQL database via Neon serverless driver (`@neondatabase/serverless`)
- Drizzle ORM for type-safe database queries and migrations
- Schema defined in `shared/schema.ts` with two tables:
  - `users`: id, username, password (for future authentication)
  - `contact_submissions`: id, name, phone, email, service, referral, message, createdAt

**Schema Validation**
- Zod schemas generated from Drizzle table definitions via `drizzle-zod`
- Shared types between client and server for type safety
- Insert schemas validate incoming data before database operations

### Authentication & Authorization

**Current State**
- No authentication implemented
- User schema exists in database schema for future implementation
- Session infrastructure prepared (connect-pg-simple for PostgreSQL sessions)

**Planned Architecture**
- Password-based authentication with secure hashing
- Session-based authentication using Express sessions
- PostgreSQL session store for production persistence

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
- connect-pg-simple: PostgreSQL session store for Express

**Development Tools**
- Vite: Build tool with HMR and optimized production builds
- TypeScript: Type safety across frontend and backend
- ESBuild: Fast bundling for production server build
- tsx: TypeScript execution for development server

**Replit-Specific**
- @replit/vite-plugin-runtime-error-modal: Error overlay in development
- @replit/vite-plugin-cartographer: Code navigation enhancement
- @replit/vite-plugin-dev-banner: Development environment indicator
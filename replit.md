# Chatbot Airbnb AI

## Overview

This is an AI-powered chatbot application designed for Airbnb property hosts to automate guest communication. The system features **two distinct spaces**:

1. **Espace Hôte** - Sophisticated admin interface where hosts manage multiple properties with comprehensive configuration options
2. **Espace Voyageur** - Guest-facing chat interface accessible via unique links, restricted to ONE property per guest

Hosts configure detailed property information (localisation, check-in procedures, WiFi, amenities, rules, etc.) and generate unique access links for their guests. Guests access their specific property via these links and interact with an AI assistant powered by Google Gemini API that provides contextual answers based on the host's configuration.

The application features a landing page showcasing the product, separate host and guest spaces, real-time WebSocket chat, auto-save functionality, and **subscription-based monetization with Stripe**.

## Subscription System

**Pricing Tiers:**
- **Gratuit (Free)**: 1 property, unlimited conversations, basic AI assistant, email support
- **Pro (€39/mois)**: 5 properties, unlimited conversations, advanced AI, priority support, detailed analytics, 7-day free trial
- **Business (€99/mois)**: Unlimited properties, premium AI, VIP 24/7 support, advanced analytics, API integration, 7-day free trial

**Payment Features:**
- 7-day free trial for all paid plans (Pro & Business)
- All Stripe payment methods supported (card, SEPA, Apple Pay, Google Pay, etc.)
- No credit card required for free plan
- Cancel anytime functionality
- Subscription managed via Stripe webhook integration

## Recent Changes

**Authentication System (November 3, 2025):**
- Migrated from Replit Auth to independent email/password authentication
- Implemented passport-local strategy with scrypt password hashing (per-user salts)
- Added secure session management with httpOnly cookies
- Created custom Auth page with login/register forms at /auth route
- Updated all protected routes to use req.user.id (was req.user.claims.sub)
- Added logout button to AdminHost header
- Removed replitAuth.ts dependencies
- Session SECRET required: SESSION_SECRET environment variable

**AI Integration (November 2025):**
- Migrated from OpenAI to Google Gemini API for free tier access
- Free quota: 15 requests/minute, 1500 requests/day
- Model: "gemini-2.5-flash" (latest fast model)
- API key from Google AI Studio (not Vertex AI)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching
- Shadcn UI component library built on Radix UI primitives
- Tailwind CSS for styling with a custom design system

**Design System:**
- Custom theme based on Airbnb's hospitality aesthetic with HSL color tokens
- Support for light/dark mode theming
- Responsive design with mobile-first approach
- Design guidelines emphasize warmth, trust, and modern messaging interfaces

**Page Structure:**
- **Landing page** (`/`) - Hero, features, how-it-works, testimonials, and CTA sections with pricing link
- **Auth page** (`/auth`) - Dual login/register forms with email/password authentication
- **Pricing page** (`/pricing`) - Three-tier pricing display with plan comparison and subscription CTAs
- **Subscribe page** (`/subscribe`) - Stripe checkout with Payment Element supporting all payment methods
- **Host Space** (`/host`) - Sophisticated admin interface with:
  - Property list sidebar
  - Guest link generator with copy functionality
  - Tabbed configuration (5 tabs: Général, Check-in/out, Équipements, Règles, Infos Utiles)
  - Auto-save on field blur
  - Real-time toast notifications
  - Logout button in header
  - Authentication required (passport-local)
- **Guest Space** (`/guest/:accessKey`) - Simplified chat interface with:
  - Access via unique property link only
  - Property-specific branding
  - Conversation starter dialog
  - Real-time AI chat with WebSocket
  - Restricted to ONE property (security enforced)
- **Legacy Chat page** (`/chat`) - Host conversation management (maintained for backward compatibility)
- Component-based architecture with reusable UI components

**State Management:**
- React Query for API data fetching, caching, and synchronization
- Local component state with React hooks
- WebSocket integration for real-time message updates

### Backend Architecture

**Technology Stack:**
- Node.js with Express server
- TypeScript for type safety across the stack
- Drizzle ORM for database interactions
- PostgreSQL database (via Neon serverless)
- WebSocket (ws library) for real-time bidirectional communication

**API Design:**
- RESTful endpoints:
  - Auth: POST `/api/register`, POST `/api/login`, POST `/api/logout`, GET `/api/user` (protected)
  - Properties: GET `/api/properties`, GET `/api/properties/:id`, GET `/api/properties/by-key/:accessKey`, POST `/api/properties` (protected), PATCH `/api/properties/:id`
  - Conversations: GET `/api/conversations/property/:propertyId`, POST `/api/conversations`
  - Messages: GET `/api/messages/:conversationId`, POST `/api/messages`
  - Subscriptions: POST `/api/create-subscription` (protected), GET `/api/subscription-status` (protected), POST `/api/cancel-subscription` (protected)
- WebSocket endpoint (`/ws`) for real-time chat message delivery
- Request/response logging middleware for debugging
- JSON-based communication with validation via Zod schemas
- Security: accessKey-based property access for guests, passport-local session-based authentication for host routes

**Server Architecture:**
- Modular route registration pattern
- Separation of concerns with dedicated storage abstraction layer
- In-memory storage implementation (MemStorage) as fallback with default seed data
- Integration with Vite middleware for development HMR
- Static file serving for production builds

### Data Storage

**Database Schema (PostgreSQL):**
- `users` table: User accounts with authentication and subscription data:
  - **Identity**: id (text, primary key), email, password (scrypt hashed), firstName, lastName, profileImageUrl
  - **Subscription**: stripeCustomerId, stripeSubscriptionId, plan (free/pro/business), subscriptionStatus, trialStartedAt, trialEndsAt, activePropertyCount
  - **Timestamps**: createdAt, updatedAt
- `properties` table: Comprehensive property information organized by category:
  - **System**: id (UUID), userId (foreign key to users), accessKey (unique 12-char), createdAt
  - **General**: name, description
  - **Location**: address, floor, doorCode, accessInstructions
  - **Check-in/out**: checkInTime, checkOutTime, checkInProcedure, checkOutProcedure, keyLocation
  - **WiFi**: wifiName, wifiPassword
  - **Amenities**: amenities (array), kitchenEquipment, applianceInstructions, heatingInstructions
  - **Rules**: houseRules, maxGuests, petsAllowed, smokingAllowed, partiesAllowed, garbageInstructions
  - **Transport & Services**: parkingInfo, publicTransport, nearbyShops, restaurants
  - **Contact**: hostName, hostPhone, emergencyContact
  - **Additional**: additionalInfo, faqs
- `conversations` table: Links properties to guest conversations with guest name and timestamps
- `messages` table: Stores individual chat messages with conversation reference, content, bot flag, and timestamps
- Foreign key relationships with cascade deletion to maintain referential integrity

**ORM Strategy:**
- Drizzle ORM provides type-safe database queries
- Schema definitions in TypeScript generate runtime types
- Zod integration for runtime validation of insert operations
- Migration support via drizzle-kit

**Storage Abstraction:**
- IStorage interface defines contract for data operations including `getPropertyByAccessKey()`
- MemStorage provides in-memory implementation for development/testing
- Default property seeded on initialization with accessKey "demo-paris-01"
- Auto-generates unique 12-character accessKey for new properties
- Ready for PostgreSQL implementation swap

### Real-time Communication

**WebSocket Implementation:**
- Persistent WebSocket connections for live chat updates
- Automatic reconnection logic with timeout handling
- Message handler and error handler callback patterns
- Client-side WebSocket wrapper class for connection management
- Server broadcasts new messages to connected clients
- Handles user messages and AI-generated responses simultaneously

### AI Integration

**Google Gemini Integration:**
- **Migration Note**: Migrated from OpenAI to Google Gemini API (November 2025) for free tier access
- Uses Google Gemini "gemini-2.5-flash" model for fast, cost-effective responses
- Free quota: 15 requests/minute, 1500 requests/day (sufficient for development and moderate production use)
- System prompt constructed dynamically from comprehensive property configuration (25+ fields)
- Context includes all configured fields: location details, check-in/out procedures, WiFi, amenities, equipment instructions, house rules, parking, transport, shops, emergency contacts, FAQs, and more
- Configured for friendly, professional, and concise responses
- Error handling with fallback messages
- Required: `GEMINI_API_KEY` environment variable (from Google AI Studio, not Vertex AI)

**Response Strategy:**
- AI instructed to suggest contacting host directly for unknown information
- Maintains brand voice of hospitality and helpfulness
- French language interface (primary language: French)
- Leverages all property details to provide accurate, context-aware responses

## External Dependencies

### Third-party Services

**Google Gemini API:**
- Required: `GEMINI_API_KEY` environment variable
- Model: "gemini-2.5-flash" (latest fast model as of November 2025)
- Purpose: Generate contextual responses to guest inquiries
- Quota: 15 requests/minute, 1500 requests/day (free tier)
- API key source: Google AI Studio (not Vertex AI)

**Stripe (Optional):**
- Required only for subscription features: `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLIC_KEY`
- Used for payment processing and subscription management
- Application functions without Stripe for testing AI features

**Database:**
- PostgreSQL via Supabase (`pg` + `drizzle-orm/node-postgres`)
- Required: `DATABASE_URL` environment variable
- Connection pooling and serverless optimization included
- Database migrations managed via Drizzle Kit

### UI Component Libraries

**Radix UI Primitives:**
- Comprehensive set of accessible, unstyled UI components
- Includes: Dialog, Dropdown, Select, Toast, Tooltip, Accordion, Avatar, Checkbox, and more
- Provides keyboard navigation, ARIA attributes, and focus management

**Shadcn UI:**
- Pre-styled component variants built on Radix primitives
- Custom configuration via `components.json`
- Tailwind-based styling system
- "New York" style variant selected

### Build and Development Tools

**Vite Plugins:**
- `@vitejs/plugin-react` for React Fast Refresh
- `@replit/vite-plugin-runtime-error-modal` for error overlay
- `@replit/vite-plugin-cartographer` for development mapping (Replit-specific)
- `@replit/vite-plugin-dev-banner` for development banner (Replit-specific)

**Session Management:**
- `connect-pg-simple` for PostgreSQL-backed session storage
- Express session middleware for stateful user sessions

### Additional Libraries

**Form Management:**
- `react-hook-form` for form state and validation
- `@hookform/resolvers` for Zod schema validation integration

**Utilities:**
- `date-fns` for date formatting and manipulation
- `class-variance-authority` for component variant styling
- `clsx` and `tailwind-merge` for conditional class composition
- `nanoid` for unique ID generation

**Carousel:**
- `embla-carousel-react` for image/content carousels

**Icons:**
- `lucide-react` for consistent icon system
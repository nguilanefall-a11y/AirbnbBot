# Chatbot Airbnb AI

## Overview

This is an AI-powered chatbot application designed for Airbnb property hosts to automate guest communication. The system allows hosts to manage multiple properties, create conversations with guests, and leverage OpenAI's GPT-5 model to automatically respond to common guest inquiries about check-in times, WiFi credentials, amenities, house rules, and other property-specific information.

The application features a landing page showcasing the product, a chat interface for real-time guest conversations, and an admin panel for property management.

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
- Landing page with hero, features, how-it-works, testimonials, and CTA sections
- Chat page with dual-panel layout (conversation list + message thread)
- Admin page for property CRUD operations
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
- RESTful endpoints for CRUD operations on properties, conversations, and messages
- WebSocket endpoint (`/ws`) for real-time chat message delivery
- Request/response logging middleware for debugging
- JSON-based communication with validation via Zod schemas

**Server Architecture:**
- Modular route registration pattern
- Separation of concerns with dedicated storage abstraction layer
- In-memory storage implementation (MemStorage) as fallback with default seed data
- Integration with Vite middleware for development HMR
- Static file serving for production builds

### Data Storage

**Database Schema (PostgreSQL):**
- `properties` table: Stores property information including name, description, check-in/out times, WiFi credentials, amenities array, house rules, and host contact details
- `conversations` table: Links properties to guest conversations with guest name and timestamps
- `messages` table: Stores individual chat messages with conversation reference, content, bot flag, and timestamps
- Foreign key relationships with cascade deletion to maintain referential integrity

**ORM Strategy:**
- Drizzle ORM provides type-safe database queries
- Schema definitions in TypeScript generate runtime types
- Zod integration for runtime validation of insert operations
- Migration support via drizzle-kit

**Storage Abstraction:**
- IStorage interface defines contract for data operations
- MemStorage provides in-memory implementation for development/testing
- Default property seeded on initialization
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

**OpenAI Integration:**
- Uses OpenAI GPT-5 model (referenced as latest model from August 2025)
- System prompt constructed dynamically from property details
- Context includes: property name, description, address, host info, check-in/out times, WiFi credentials, amenities, parking, house rules, and additional info
- Configured for friendly, professional, and concise responses
- 500 token max completion limit for efficient responses
- Error handling with fallback messages

**Response Strategy:**
- AI instructed to suggest contacting host directly for unknown information
- Maintains brand voice of hospitality and helpfulness
- French language interface (primary language: French)

## External Dependencies

### Third-party Services

**OpenAI API:**
- Required: `OPENAI_API_KEY` environment variable
- Model: GPT-5 (chat completions endpoint)
- Purpose: Generate contextual responses to guest inquiries
- Configuration: Max 500 completion tokens per request

**Database:**
- PostgreSQL via Neon serverless (`@neondatabase/serverless`)
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
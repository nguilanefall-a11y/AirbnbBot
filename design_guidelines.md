# Design Guidelines: Chatbot Airbnb AI

## Design Approach
**Reference-Based Design** inspired by Airbnb's hospitality aesthetic, combined with modern messaging interfaces like Intercom and WhatsApp Web. Focus on warmth, trust, and effortless communication.

## Typography
- **Primary Font**: Circular or Inter from Google Fonts
- **Headings**: 32px-48px (semibold) for hero, 24px-28px for section titles
- **Body Text**: 16px (regular) for chat messages and content
- **Small Text**: 14px for timestamps, labels, and metadata
- **Monospace**: For property codes, confirmation numbers

## Layout System
**Tailwind Spacing Units**: Consistently use 2, 4, 6, 8, 12, 16, 20, 24 for margins, padding, and gaps
- Component spacing: p-4 to p-6
- Section spacing: py-12 to py-20
- Card gaps: gap-4 to gap-6

## Core Components

### Landing Page
**Hero Section** (80vh):
- Large, welcoming headline: "Votre Assistant Airbnb Intelligent 24/7"
- Subheading explaining automated guest communication
- Split layout: Left side text + CTA, right side chat preview mockup
- Hero background: Subtle gradient or soft property image with 40% overlay

**Features Section** (3-column grid on desktop):
- AI Response Intelligence with brain/sparkle icon
- Instant Availability with clock icon
- Multi-language Support with globe icon
- Knowledge Base Management with book icon
Each card: icon, title, 2-3 line description, subtle border

**How It Works** (4-step timeline):
Horizontal flow showing: Setup → Customize → Activate → Relax
Each step includes number badge, icon, title, brief description

**Testimonials** (2-column grid):
Host photos, quotes, property type labels, 5-star ratings

**CTA Section**:
"Commencez Gratuitement" prominent button
Supporting text about setup time
Trust indicators below

### Chat Interface (Main Application)
**Dual-Panel Layout**:

Left Panel (30% width):
- Host dashboard header with avatar
- Property selector dropdown
- Conversation list with guest names, preview messages, timestamps
- Unread message badges
- Search/filter functionality
- "Nouvelle conversation" button

Right Panel (70% width):
- Guest conversation header (name, property, booking dates)
- Chat message area with scrollable history
- Messages alternate: Guest (left, light gray bubble) vs Bot (right, Airbnb pink/rose bubble)
- Timestamp groups every 2-3 messages
- Input field at bottom with send button
- "AI Active" toggle indicator
- Suggested quick responses chips

### Admin/Configuration Panel
**Property Settings Card Layout**:
- Navigation tabs: Infos Générales | Règles | Équipements | FAQ
- Form sections with clear labels
- Rich text editor for custom responses
- Toggle switches for auto-reply features
- Preview pane showing how responses appear to guests
- Save/Cancel buttons (pink primary, gray secondary)

## Color Philosophy
Focus on layout, spacing, and hierarchy. Colors will be defined separately. Reference semantic roles:
- Primary actions and bot messages
- Secondary/neutral backgrounds
- Success states for confirmations
- Borders and dividers
- Text hierarchy (headings, body, muted)

## Component Specifications

### Message Bubbles
- Max width: 65% of container
- Padding: p-4
- Rounded corners: rounded-2xl (softer than standard)
- Tail indicator on first message of group
- Avatar for guest messages only

### Cards
- Border: 1px solid with subtle shadow
- Padding: p-6
- Rounded corners: rounded-xl
- Hover state: subtle lift (transform)

### Buttons
Primary: Full rounded (rounded-full), px-8 py-3, medium weight text
Secondary: Rounded-lg, outlined style, px-6 py-2.5
Icon buttons: Square with rounded-lg, p-2.5

### Input Fields
- Height: h-12
- Rounded: rounded-lg
- Border: 1.5px
- Focus ring: 2px offset
- Label above, helper text below

## Navigation
**Landing Page Header**:
- Logo left
- Navigation: Fonctionnalités | Tarifs | Connexion (right aligned)
- Sticky on scroll with backdrop blur

**Application Header**:
- Logo + host name left
- Property switcher center
- Notifications bell + profile dropdown right
- Compact height (h-16)

## Icons
**Heroicons** via CDN (outline style for interface, solid for emphasis)
- Message icons for chat
- Settings gear for configuration
- Bell for notifications
- Globe for language
- Clock for availability

## Images

### Hero Section
**Large background image**: Modern Airbnb property interior (bright, welcoming living room or exterior with pool)
- Positioning: Right 50% of hero on desktop, background on mobile
- Treatment: Subtle gradient overlay for text readability
- Style: Professional photography, warm lighting

### Feature Section
**Chat Interface Mockup**: Screenshot or illustration of the chat interface in action
- Placement: Center or right side of features
- Shows actual conversation flow example

### Testimonials
**Host Profile Photos**: Circular avatars (w-16 h-16)
- Authentic, friendly headshots
- Diverse representation

### Property Cards (Admin)
**Property Thumbnails**: Small images in property selector
- Size: w-12 h-12 or w-16 h-16
- Rounded corners: rounded-md

## Accessibility
- Minimum touch target: 44x44px for mobile
- Focus indicators on all interactive elements
- Proper heading hierarchy (h1 → h2 → h3)
- ARIA labels for icon buttons
- Color contrast ratios meet WCAG AA
- Keyboard navigation support throughout chat interface

## Responsive Behavior
**Desktop (lg+)**: Dual-panel layout, 3-column grids
**Tablet (md)**: Side drawer for conversations, 2-column grids
**Mobile (base)**: Full-screen views with navigation between panels, single column, stack all sections

## Animations
**Minimal & Purposeful**:
- Message send: Slide up + fade in (200ms)
- New message received: Gentle pulse notification
- Button hover: Subtle scale (1.02) + shadow increase
- Panel transitions: Slide animations (300ms ease)
**No** scroll-triggered animations, parallax, or decorative motion

This design creates a professional, trustworthy platform that feels native to the Airbnb ecosystem while providing hosts with powerful automation tools.
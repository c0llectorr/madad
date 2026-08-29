# MADAD Project Overview

## Project Description
MADAD is an AI-assisted disaster relief coordination system built for the Bano Qabil Alibaba Cloud AI Hackathon 2026. The system extracts structured needs from field reports, prioritizes affected sites, and plans/replans delivery routes around road damage in real-time.

## Architecture Overview

### Backend (FastAPI Python)
- **Framework**: FastAPI with SQLAlchemy ORM
- **Database**: SQLite (development), PostgreSQL (production ready)
- **Authentication**: JWT-based authentication with role-based access
- **AI Integration**: Qwen/Qwen++ API for report extraction, with fallback to Gemma/Ollama
- **Core Services**: 
  - Report extraction from raw text using AI
  - Site prioritization with scoring engine
  - Route planning with OSMnx/NetworkX
  - Replanning service for dynamic route adjustments

### Frontend (React Native/Expo)
- **Framework**: Expo with React Native
- **Navigation**: React Navigation
- **State Management**: Zustand + React Query
- **Mapping**: MapLibre/React Native Maps
- **Form Handling**: React Hook Form with Zod validation
- **Styling**: Custom theme system with design tokens

### Database Layer
- **Primary**: PostgreSQL with comprehensive schema
- **Development**: SQLite for local testing
- **Schema**: Normalized relational database with constraints
- **Data Integrity**: Transaction-based operations with check constraints

## Core Features Implemented

### 1. Authentication & Multi-tenancy
- JWT-based authentication with center isolation
- Role-based access (coordinator/admin)
- Multiple support centers with geographic isolation

### 2. Report Ingestion & AI Extraction
- Manual report entry via structured forms
- Raw text report processing with AI extraction
- Qwen API integration for entity extraction
- Geocoding service with fuzzy location matching
- Coordinator verification workflow

### 3. Site Prioritization
- Deterministic scoring engine with weighted factors:
  - Population size
  - Urgency flags (elderly, children, injuries, etc.)
  - Severity levels
  - Time decay factor
- Transparent reasoning generation for display

### 4. Depot & Inventory Management
- Multiple depots per support center
- Real-time inventory tracking
- Resource type standardization
- Negative quantity protection

### 5. Route Planning & Damage Management
- OSMnx/NetworkX graph-based routing
- Road damage reporting system
- Dynamic route replanning
- Travel time estimation with detour calculations

### 6. Allocation Planning & Dispatch
- Greedy resource-to-site matching algorithm
- Multi-table transactional dispatch creation
- Forward-only status state machine
- Real-time replanning on road damage events

### 7. Dispatch Management
- ACID-compliant dispatch execution
- Inventory decrement with validation
- Route visualization with GeoJSON
- Status tracking (planned → en_route → delivered)

## Technical Stack Details

### Backend Stack
- **Python 3.11+**
- **FastAPI 0.115.0** - API framework
- **SQLAlchemy 2.0.35** - ORM
- **Pydantic 2.9.2** - Data validation
- **JWT** - Authentication
- **OSMnx 1.9.4** - Geographic routing
- **NetworkX 3.3** - Graph algorithms
- **RapidFuzz 3.9.7** - Fuzzy string matching

### Frontend Stack
- **Expo ~55.0.0**
- **React Native 0.83.10**
- **TypeScript ~5.9.2**
- **React Navigation 7.x**
- **Zustand 4.5.5** - State management
- **TanStack React Query 5.59.0** - Data fetching
- **React Hook Form 7.53.0** - Form handling
- **Zod 3.23.8** - Validation
- **MapLibre React Native 11.3.7** - Mapping

### Database Stack
- **PostgreSQL 14+** (production)
- **SQLite** (development)
- **Psycopg2 2.9.9** - PostgreSQL adapter
- **Alembic-ready migrations**

## Project Structure

```
madad/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/routes/        # API endpoints
│   │   ├── core/              # Configuration, security
│   │   ├── db/                # Database models, session
│   │   ├── schemas/           # Pydantic models
│   │   └── services/          # Business logic
│   ├── features-backend/      # Implementation plans
│   ├── tests/                 # Unit tests
│   └── requirements.txt
├── frontend/                  # React Native frontend
│   ├── src/
│   │   ├── api/              # API clients
│   │   ├── components/       # Reusable components
│   │   ├── context/          # React context
│   │   ├── hooks/           # Custom hooks
│   │   ├── screens/         # Screen components
│   │   ├── store/           # Zustand stores
│   │   ├── types/           # TypeScript types
│   │   └── validation/      # Zod schemas
│   ├── app/                 # Expo Router entry points
│   └── package.json
├── database/                 # Database layer
│   ├── postgres/            # PostgreSQL schema, migrations
│   ├── sqlite/              # SQLite schema (phase 2)
│   ├── geodata/             # OSM data processing
│   └── demo_data/           # Sample data
├── docs/                    # Documentation
│   └── API_CONTRACT.md     # Single source of truth
└── README.md               # Project overview
```

## Key Design Decisions

### 1. Single Source of Truth
- `API_CONTRACT.md` serves as the definitive API specification
- Backend and frontend implementations must match the contract
- Eliminates version drift between components

### 2. Transaction Safety
- Dispatch creation is atomic (inventory + site status + dispatch record)
- Database constraints prevent negative inventory
- Forward-only status transitions

### 3. Offline-First Architecture
- Schema designed for eventual SQLite sync
- Provider-agnostic extraction layer
- Phase 2 ready for offline capability

### 4. AI Integration Strategy
- Qwen API for production, Gemma/Ollama for offline fallback
- Deterministic fallback extraction when AI unavailable
- Confidence scoring for AI-extracted data

### 5. Geographic Intelligence
- OSMnx for real-world road network routing
- Fuzzy geocoding for location matching
- Damage-aware route optimization

## Development Workflow

### Backend Development
1. Update `API_CONTRACT.md` for any API changes
2. Implement backend routes matching the contract
3. Add corresponding Pydantic schemas
4. Implement service layer business logic
5. Run tests to verify functionality

### Frontend Development
1. Reference `API_CONTRACT.md` for API expectations
2. Update TypeScript types to match
3. Implement API client functions
4. Build UI components with proper state management
5. Test integration with backend

### Database Changes
1. Update `database/postgres/schema.sql`
2. Create migration in `database/postgres/migrations/`
3. Update SQLAlchemy models in backend
4. Update seed data if necessary

## Demo Data & Testing

The system includes comprehensive demo data:
- **Sample Reports**: 17 staged reports in mixed Urdu/English
- **Damage Events**: Pre-staged bridge damage for replanning demo
- **Seed Depots**: Machine-readable depot configurations
- **Geographic Data**: Pre-fetched OSM road network for Rajanpur region

## Current Status

The project is fully functional with:
- ✅ Complete backend API implementation
- ✅ Frontend mobile application
- ✅ Database schema with constraints
- ✅ AI integration for report extraction
- ✅ Geographic routing with damage avoidance
- ✅ Transaction-safe dispatch system
- ✅ Comprehensive documentation

## Phase 2 Considerations (Not Implemented)
1. SQLite offline sync capability
2. End-of-day report export
3. Report deduplication/merging UI
4. PDF dispatch order generation
5. Local Gemma/Ollama model integration

This represents a production-ready disaster relief coordination system with AI-assisted decision making, real-time routing, and comprehensive audit trails.
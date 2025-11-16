# App Library - Technical Specification

**Feature:** Application Library with Auto-Authentication
**Version:** 1.0.0
**Last Updated:** 2025-11-15
**Status:** Planning Phase

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Feature Structure](#feature-structure)
3. [Data Models](#data-models)
4. [API Endpoints](#api-endpoints)
5. [Frontend Components](#frontend-components)
6. [Security](#security)
7. [Performance Considerations](#performance-considerations)
8. [Integration Points](#integration-points)

---

## Architecture Overview

The app-library feature follows the tools-dashboard feature-centered architecture pattern, spanning multiple services and layers.

### System Context

```
┌──────────────────────────────────────────────────────────────┐
│                    Tools Dashboard Platform                   │
│                                                               │
│  ┌────────────────┐         ┌────────────────┐              │
│  │  front-public  │         │  front-admin   │              │
│  │  App Library   │         │  App Management│              │
│  │  Dashboard     │         │  Console       │              │
│  └───────┬────────┘         └───────┬────────┘              │
│          │                          │                        │
│          │ (Displays apps)          │ (CRUD operations)      │
│          │                          │                        │
│          ▼                          ▼                        │
│  ┌─────────────────────────────────────────────┐            │
│  │           back-api (Business Logic)         │            │
│  │                                              │            │
│  │  - GET /api/oauth-clients (public)          │            │
│  │  - GET /api/oauth-clients/:id (public)      │            │
│  │  - POST /api/admin/app-library (admin)      │            │
│  │  - PUT /api/admin/app-library/:id (admin)   │            │
│  │  - DELETE /api/admin/app-library/:id        │            │
│  │  - POST /api/admin/app-library/:id/access   │            │
│  │  - GET /api/admin/app-library/:id/usage     │            │
│  └─────────────────┬───────────────────────────┘            │
│                    │                                         │
│                    │ (Fetches/stores data)                   │
│                    │                                         │
│          ┌─────────┴───────────┐                             │
│          ▼                     ▼                             │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │ back-postgres│      │ back-cassandra│                    │
│  │              │      │               │                    │
│  │ - apps       │      │ - app_launches│                    │
│  │ - access_rules│     │ - usage_events│                    │
│  │ - user_prefs │      │               │                    │
│  └──────────────┘      └──────────────┘                     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                           │
                           │ OAuth Flow
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                  External Applications                        │
│                  (E-Cards, Invoice Gen, etc.)                 │
└──────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Separation of Concerns:**
   - front-public: User-facing library browsing
   - front-admin: Administrative management
   - back-api: Business logic and data orchestration
   - back-postgres: Application registry storage
   - back-cassandra: Usage tracking and analytics

2. **Security First:**
   - OAuth 2.0 integration leverages existing auto-auth feature
   - Access control evaluated at multiple layers
   - All admin operations require authentication and authorization

3. **Performance:**
   - Redis caching for frequently accessed app data
   - Lazy loading of application logos
   - Pagination for admin lists

4. **Scalability:**
   - Stateless API design
   - Database queries optimized with indexes
   - Support for horizontal scaling

---

## Feature Structure

Following the feature-centered architecture, code is organized by feature across all layers:

### 1. Front-Public (`front-public/app/features/app-library/`)

```
front-public/app/features/app-library/
├── feature.yaml                    # Feature metadata
├── routes/
│   ├── index.tsx                  # Main library dashboard
│   ├── favorites.tsx              # User favorites (future)
│   └── recent.tsx                 # Recently used apps (future)
├── ui/
│   ├── AppCard.tsx                # Individual app card component
│   ├── AppGrid.tsx                # Responsive grid layout
│   ├── AppLauncher.tsx            # OAuth launch handler
│   ├── EmptyState.tsx             # No apps available state
│   └── LoadingState.tsx           # Loading skeleton
├── utils/
│   ├── app-filter.ts              # Client-side filtering logic
│   └── app-sort.ts                # Sorting utilities
└── __init__.py
```

**Key Responsibilities:**
- Display available applications to users
- Initiate OAuth flow when user clicks app
- Handle user preferences (favorites, recently used)
- No business logic - delegates to back-api

### 2. Front-Admin (`front-admin/app/features/app-library/`)

```
front-admin/app/features/app-library/
├── feature.yaml                    # Feature metadata
├── routes/
│   ├── index.tsx                  # List all applications
│   ├── new.tsx                    # Register new application
│   ├── $id.tsx                    # Application detail/edit
│   ├── $id.access.tsx            # Access control management
│   └── $id.usage.tsx             # Usage statistics
├── ui/
│   ├── AppList.tsx                # DataTable of applications
│   ├── AppForm.tsx                # Create/Edit form
│   ├── AccessControl.tsx          # Access rules UI
│   ├── UserSearch.tsx             # Search users for access control
│   ├── UsageChart.tsx             # Usage visualization
│   ├── SecretDisplay.tsx          # Display client_secret once
│   └── DeleteConfirmation.tsx     # Delete confirmation modal
├── utils/
│   ├── client-id-generator.ts     # Generate unique client IDs
│   ├── secret-generator.ts        # Generate client secrets
│   └── validation.ts              # Form validation schemas (Zod)
└── __init__.py
```

**Key Responsibilities:**
- Application CRUD operations
- Access control management
- Usage analytics display
- Secret generation and display
- No database access - delegates to back-api

### 3. Back-API (`back-api/features/app-library/`)

```
back-api/features/app-library/
├── feature.yaml                    # Feature metadata
├── api.py                         # FastAPI routes
│   ├── GET /api/oauth-clients
│   ├── GET /api/oauth-clients/:id
│   ├── POST /api/admin/app-library
│   ├── PUT /api/admin/app-library/:id
│   ├── DELETE /api/admin/app-library/:id
│   ├── POST /api/admin/app-library/:id/access
│   └── GET /api/admin/app-library/:id/usage
├── domain.py                      # Business logic
│   ├── get_available_apps(user_id) -> List[App]
│   ├── get_app_by_id(app_id) -> App
│   ├── create_app(app_data) -> App
│   ├── update_app(app_id, app_data) -> App
│   ├── delete_app(app_id) -> None
│   ├── update_access_control(app_id, rules) -> None
│   ├── check_user_access(user_id, app_id) -> bool
│   └── get_app_usage_stats(app_id) -> UsageStats
├── infrastructure.py              # Data access
│   ├── AppRepository (PostgreSQL)
│   ├── AccessRuleRepository (PostgreSQL)
│   ├── UsageRepository (Cassandra)
│   └── UserPrefRepository (PostgreSQL)
└── __init__.py
```

**Key Responsibilities:**
- Orchestrate business logic
- Validate access control rules
- Aggregate usage statistics
- Enforce authorization policies
- Integrate with back-postgres and back-cassandra

### 4. Shared Contracts (`shared/contracts/app-library/`)

```
shared/contracts/app-library/
├── feature.yaml                    # Feature contract
├── models.py                      # Pydantic models
│   ├── App                        # Application model
│   ├── AppCreate                  # App creation DTO
│   ├── AppUpdate                  # App update DTO
│   ├── AccessRule                 # Access control rule
│   ├── UserPreference             # User favorites/recent
│   └── UsageStats                 # Usage statistics
└── __init__.py
```

**Key Responsibilities:**
- Define shared data models
- Ensure type consistency across services
- Provide validation schemas

---

## Data Models

### 1. Application Model

```python
# shared/contracts/app-library/models.py

from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Literal
from datetime import datetime
from uuid import UUID

class App(BaseModel):
    """Application in the library"""
    id: UUID
    client_id: str = Field(..., description="OAuth client ID")
    client_name: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    logo_url: Optional[HttpUrl] = None
    dev_url: HttpUrl = Field(..., description="Development environment URL")
    prod_url: Optional[HttpUrl] = Field(None, description="Production environment URL")
    redirect_uris: List[str] = Field(..., min_items=1)
    allowed_scopes: List[str] = Field(default=["profile", "email"])
    is_active: bool = Field(default=False)
    created_at: datetime
    updated_at: datetime
    created_by: UUID

    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "client_id": "ecards_a1b2c3d4",
                "client_name": "E-Card + QR-Code Batch Generator",
                "description": "Create stunning personalized cards with dynamic QR codes",
                "logo_url": "https://example.com/logos/ecards.png",
                "dev_url": "http://localhost:7300",
                "prod_url": "https://ecards.example.com",
                "redirect_uris": [
                    "http://localhost:7300/auth/callback",
                    "https://ecards.example.com/auth/callback"
                ],
                "allowed_scopes": ["profile", "email", "subscription"],
                "is_active": True,
                "created_at": "2025-11-15T10:00:00Z",
                "updated_at": "2025-11-15T10:00:00Z",
                "created_by": "660e8400-e29b-41d4-a716-446655440000"
            }
        }

class AppCreate(BaseModel):
    """DTO for creating new application"""
    client_name: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    logo_url: Optional[HttpUrl] = None
    dev_url: HttpUrl
    prod_url: Optional[HttpUrl] = None
    redirect_uris: List[str] = Field(..., min_items=1)
    allowed_scopes: List[str] = Field(default=["profile", "email"])
    is_active: bool = Field(default=False)

class AppUpdate(BaseModel):
    """DTO for updating application"""
    client_name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    logo_url: Optional[HttpUrl] = None
    dev_url: Optional[HttpUrl] = None
    prod_url: Optional[HttpUrl] = None
    redirect_uris: Optional[List[str]] = Field(None, min_items=1)
    allowed_scopes: Optional[List[str]] = None
    is_active: Optional[bool] = None
```

### 2. Access Rule Model

```python
class AccessMode(str, Enum):
    ALL_USERS = "all_users"
    ALL_EXCEPT = "all_except"
    ONLY_SPECIFIED = "only_specified"
    SUBSCRIPTION_BASED = "subscription_based"

class AccessRule(BaseModel):
    """Access control rule for an application"""
    id: UUID
    app_id: UUID
    mode: AccessMode = AccessMode.ALL_USERS
    user_ids: List[UUID] = Field(default_factory=list)
    subscription_tiers: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    created_by: UUID

    class Config:
        json_schema_extra = {
            "example": {
                "id": "770e8400-e29b-41d4-a716-446655440000",
                "app_id": "550e8400-e29b-41d4-a716-446655440000",
                "mode": "subscription_based",
                "user_ids": [],
                "subscription_tiers": ["pro", "enterprise"],
                "created_at": "2025-11-15T10:00:00Z",
                "updated_at": "2025-11-15T10:00:00Z",
                "created_by": "660e8400-e29b-41d4-a716-446655440000"
            }
        }
```

### 3. User Preference Model

```python
class UserPreference(BaseModel):
    """User's app preferences (favorites, recently used)"""
    id: UUID
    user_id: UUID
    app_client_id: str
    is_favorite: bool = False
    last_launched_at: Optional[datetime] = None
    launch_count: int = 0
    created_at: datetime
    updated_at: datetime
```

### 4. Usage Stats Model

```python
class UsageStats(BaseModel):
    """Application usage statistics"""
    app_id: UUID
    total_users: int = Field(..., description="Users with access")
    active_users: int = Field(..., description="Launched in last 30 days")
    total_launches: int = Field(..., description="All-time launches")
    launches_this_month: int
    avg_launches_per_user: float
    first_launch_date: Optional[datetime] = None
    last_launch_date: Optional[datetime] = None
    daily_launches: List[dict] = Field(
        default_factory=list,
        description="[{date: '2025-11-15', count: 42}, ...]"
    )
```

---

## API Endpoints

### Public Endpoints (No Auth Required)

#### GET `/api/oauth-clients`

**Purpose:** List all active applications for the app library

**Query Parameters:**
- `include_inactive` (boolean, default: false) - Include inactive apps (admin only)

**Response:** `200 OK`
```json
[
  {
    "client_id": "ecards_a1b2c3d4",
    "client_name": "E-Card + QR-Code Batch Generator",
    "description": "Create stunning personalized cards with dynamic QR codes",
    "logo_url": "https://example.com/logos/ecards.png",
    "redirect_uris": ["http://localhost:7300/auth/callback"],
    "allowed_scopes": ["profile", "email", "subscription"],
    "launch_url": "http://localhost:7300"
  }
]
```

**Implementation:**
```python
@router.get("/api/oauth-clients")
async def get_oauth_clients(
    include_inactive: bool = False,
    current_user: Optional[User] = Depends(get_current_user)
):
    """Get list of OAuth clients for app library"""

    # Get all apps
    apps = await domain.get_available_apps(
        user_id=current_user.id if current_user else None,
        include_inactive=include_inactive
    )

    # Filter based on access control
    accessible_apps = []
    for app in apps:
        if current_user and await domain.check_user_access(current_user.id, app.id):
            accessible_apps.append(app)
        elif not current_user and app.is_active:
            accessible_apps.append(app)

    return [app.dict(exclude={"client_secret_hash", "created_by"}) for app in accessible_apps]
```

#### GET `/api/oauth-clients/:client_id`

**Purpose:** Get details of a specific application

**Response:** `200 OK`
```json
{
  "client_id": "ecards_a1b2c3d4",
  "client_name": "E-Card + QR-Code Batch Generator",
  "description": "Create stunning personalized cards with dynamic QR codes",
  "logo_url": "https://example.com/logos/ecards.png",
  "redirect_uris": ["http://localhost:7300/auth/callback"],
  "allowed_scopes": ["profile", "email", "subscription"],
  "launch_url": "http://localhost:7300"
}
```

---

### Admin Endpoints (Require Admin Role)

#### POST `/api/admin/app-library`

**Purpose:** Register a new application

**Request Body:**
```json
{
  "client_name": "E-Card + QR-Code Batch Generator",
  "description": "Create stunning personalized cards with dynamic QR codes, customizable templates, and intelligent name parsing. From design to deployment in minutes.",
  "logo_url": "https://cdn.example.com/logos/ecards.png",
  "dev_url": "http://localhost:7300",
  "prod_url": "https://ecards.epicstudio.com",
  "redirect_uris": [
    "http://localhost:7300/auth/callback",
    "https://ecards.epicstudio.com/auth/callback"
  ],
  "allowed_scopes": ["profile", "email", "subscription"],
  "is_active": false
}
```

**Response:** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "client_id": "ecards_a1b2c3d4",
  "client_secret": "s3cr3t_0nly_sh0wn_0nc3_d0_n0t_l0s3",
  "client_name": "E-Card + QR-Code Batch Generator",
  "description": "...",
  "logo_url": "...",
  "dev_url": "http://localhost:7300",
  "prod_url": "https://ecards.epicstudio.com",
  "redirect_uris": [...],
  "allowed_scopes": [...],
  "is_active": false,
  "created_at": "2025-11-15T10:00:00Z"
}
```

**Implementation:**
```python
@router.post("/api/admin/app-library", status_code=201)
async def create_app(
    app_data: AppCreate,
    current_admin: User = Depends(require_admin)
):
    """Register new application"""

    # Generate client_id
    client_id = generate_client_id(app_data.client_name)

    # Generate client_secret
    client_secret = generate_client_secret()
    client_secret_hash = bcrypt.hashpw(client_secret.encode(), bcrypt.gensalt(12))

    # Create app
    app = await domain.create_app(
        app_data=app_data,
        client_id=client_id,
        client_secret_hash=client_secret_hash,
        created_by=current_admin.id
    )

    # Return with plain client_secret (only time it's shown)
    return {
        **app.dict(),
        "client_secret": client_secret
    }
```

#### PUT `/api/admin/app-library/:id`

**Purpose:** Update application details

**Request Body:** (Same as AppUpdate model)

**Response:** `200 OK`

#### DELETE `/api/admin/app-library/:id`

**Purpose:** Delete application

**Response:** `204 No Content`

#### POST `/api/admin/app-library/:id/access`

**Purpose:** Update access control rules

**Request Body:**
```json
{
  "mode": "subscription_based",
  "user_ids": [],
  "subscription_tiers": ["pro", "enterprise"]
}
```

**Response:** `200 OK`

#### GET `/api/admin/app-library/:id/usage`

**Purpose:** Get usage statistics

**Query Parameters:**
- `from_date` (ISO 8601 date, optional)
- `to_date` (ISO 8601 date, optional)

**Response:** `200 OK`
```json
{
  "app_id": "550e8400-e29b-41d4-a716-446655440000",
  "total_users": 150,
  "active_users": 85,
  "total_launches": 1420,
  "launches_this_month": 340,
  "avg_launches_per_user": 9.47,
  "first_launch_date": "2025-10-01T08:30:00Z",
  "last_launch_date": "2025-11-15T14:22:00Z",
  "daily_launches": [
    {"date": "2025-11-01", "count": 12},
    {"date": "2025-11-02", "count": 15},
    ...
  ]
}
```

---

## Frontend Components

### Front-Public Components

#### AppCard Component

```typescript
// front-public/app/features/app-library/ui/AppCard.tsx

import { AppConfig, launchAppWithOAuth } from '../utils/oauth';

interface AppCardProps {
  app: AppConfig;
  isFavorite?: boolean;
  onFavoriteToggle?: (appId: string) => void;
}

export function AppCard({ app, isFavorite = false, onFavoriteToggle }: AppCardProps) {
  const handleLaunch = async () => {
    await launchAppWithOAuth(app);
  };

  return (
    <div className="relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200">
      {/* Favorite Star */}
      {onFavoriteToggle && (
        <button
          onClick={() => onFavoriteToggle(app.client_id)}
          className="absolute top-3 right-3 z-10"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <StarIcon filled={isFavorite} className="w-5 h-5" />
        </button>
      )}

      {/* App Logo */}
      <div className="flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        {app.logo_url ? (
          <img
            src={app.logo_url}
            alt={app.client_name}
            className="w-20 h-20 rounded-xl object-cover"
          />
        ) : (
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <span className="text-3xl font-bold text-white">
              {app.client_name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* App Info */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
          {app.client_name}
        </h3>

        {app.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
            {app.description}
          </p>
        )}

        {/* Launch Button */}
        <button
          onClick={handleLaunch}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <span>Launch App</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>

        {/* Scopes */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Access: {app.allowed_scopes.join(', ')}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
```

#### Main Library Route

```typescript
// front-public/app/features/app-library/routes/index.tsx

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { AppCard } from "../ui/AppCard";
import { EmptyState } from "../ui/EmptyState";
import { LoadingState } from "../ui/LoadingState";
import type { AppConfig } from "../utils/oauth";
import { getSession } from "~/utils/session.server";

interface LoaderData {
  apps: AppConfig[];
  favorites: string[];
  recentApps: AppConfig[];
  userEmail: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  // Check authentication
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  const userEmail = session.get("email") || "user@example.com";

  if (!userId) {
    return redirect("/user-registration");
  }

  const BACK_API_URL = process.env.BACK_API_URL || "http://localhost:8100";

  try {
    // Fetch available apps
    const appsResponse = await fetch(`${BACK_API_URL}/api/oauth-clients`, {
      headers: {
        Cookie: request.headers.get("Cookie") || "",
      },
    });

    if (!appsResponse.ok) {
      throw new Error("Failed to fetch apps");
    }

    const apps: AppConfig[] = await appsResponse.json();

    // Fetch user preferences (favorites, recent)
    const prefsResponse = await fetch(
      `${BACK_API_URL}/api/user/app-preferences`,
      {
        headers: {
          Cookie: request.headers.get("Cookie") || "",
        },
      }
    );

    const preferences = prefsResponse.ok ? await prefsResponse.json() : [];

    // Extract favorites
    const favorites = preferences
      .filter((p: any) => p.is_favorite)
      .map((p: any) => p.app_client_id);

    // Extract recent apps (last 5, within 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAppIds = preferences
      .filter((p: any) => p.last_launched_at && new Date(p.last_launched_at) > thirtyDaysAgo)
      .sort((a: any, b: any) => new Date(b.last_launched_at).getTime() - new Date(a.last_launched_at).getTime())
      .slice(0, 5)
      .map((p: any) => p.app_client_id);

    const recentApps = apps.filter(app => recentAppIds.includes(app.client_id));

    return json<LoaderData>({ apps, favorites, recentApps, userEmail });
  } catch (error) {
    console.error("Error loading app library:", error);
    return json<LoaderData>({ apps: [], favorites: [], recentApps: [], userEmail });
  }
}

export default function AppLibrary() {
  const { apps, favorites, recentApps, userEmail } = useLoaderData<typeof loader>();

  const handleFavoriteToggle = async (appId: string) => {
    // TODO: Implement favorite toggle
    await fetch("/api/user/app-preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_client_id: appId, action: "toggle_favorite" }),
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">App Library</h1>
              <p className="mt-2 text-sm text-gray-600">
                Launch your favorite applications with seamless authentication
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">{userEmail}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Recent Apps */}
        {recentApps.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recently Used</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {recentApps.map((app) => (
                <AppCard
                  key={app.client_id}
                  app={app}
                  isFavorite={favorites.includes(app.client_id)}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              ))}
            </div>
          </section>
        )}

        {/* All Apps */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {recentApps.length > 0 ? "All Applications" : "Available Applications"}
          </h2>

          {apps.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {apps.map((app) => (
                <AppCard
                  key={app.client_id}
                  app={app}
                  isFavorite={favorites.includes(app.client_id)}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
```

### Front-Admin Components

#### AppList Component

```typescript
// front-admin/app/features/app-library/ui/AppList.tsx

import { Link } from "@remix-run/react";
import { DataTable } from "~/components/DataTable";

interface App {
  id: string;
  client_id: string;
  client_name: string;
  is_active: boolean;
  user_count: number;
  updated_at: string;
}

interface AppListProps {
  apps: App[];
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
}

export function AppList({ apps, onDelete, onToggleStatus }: AppListProps) {
  const columns = [
    {
      key: "client_name",
      label: "Application Name",
      render: (app: App) => (
        <Link to={`/admin/app-library/${app.id}`} className="font-medium text-blue-600 hover:text-blue-800">
          {app.client_name}
        </Link>
      ),
    },
    {
      key: "client_id",
      label: "Client ID",
      render: (app: App) => (
        <code className="text-sm text-gray-600">{app.client_id}</code>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      render: (app: App) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            app.is_active
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {app.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "user_count",
      label: "Users",
      render: (app: App) => app.user_count.toLocaleString(),
    },
    {
      key: "updated_at",
      label: "Last Modified",
      render: (app: App) => new Date(app.updated_at).toLocaleDateString(),
    },
    {
      key: "actions",
      label: "Actions",
      render: (app: App) => (
        <div className="flex gap-2">
          <button
            onClick={() => onToggleStatus(app.id, app.is_active)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {app.is_active ? "Deactivate" : "Activate"}
          </button>
          <Link
            to={`/admin/app-library/${app.id}`}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Edit
          </Link>
          <button
            onClick={() => onDelete(app.id)}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return <DataTable data={apps} columns={columns} />;
}
```

---

## Security

### Access Control Evaluation

Access control is evaluated at multiple layers:

1. **Database Layer:** Queries filter apps based on `is_active` flag
2. **Business Logic Layer:** `check_user_access()` evaluates access rules
3. **API Layer:** Endpoints validate user authentication and authorization
4. **Frontend Layer:** Only accessible apps are displayed

**Access Control Algorithm:**

```python
async def check_user_access(user_id: UUID, app_id: UUID) -> bool:
    """Check if user has access to application"""

    # Get app
    app = await get_app_by_id(app_id)

    # Inactive apps: no access
    if not app.is_active:
        return False

    # Get access rule
    access_rule = await get_access_rule(app_id)

    # No rule: default to all users
    if not access_rule:
        return True

    # Evaluate access mode
    if access_rule.mode == AccessMode.ALL_USERS:
        return True

    elif access_rule.mode == AccessMode.ALL_EXCEPT:
        return user_id not in access_rule.user_ids

    elif access_rule.mode == AccessMode.ONLY_SPECIFIED:
        return user_id in access_rule.user_ids

    elif access_rule.mode == AccessMode.SUBSCRIPTION_BASED:
        user_subscription = await get_user_subscription(user_id)
        return user_subscription.tier in access_rule.subscription_tiers

    return False
```

### Client Secret Management

- **Generation:** Cryptographically secure random (64 chars)
- **Storage:** Hashed with bcrypt (cost factor: 12)
- **Display:** Shown only once during creation/regeneration
- **Rotation:** Supported with grace period (future enhancement)

### OAuth Integration

The app-library feature integrates with the existing auto-auth feature:

- Delegates OAuth flow to auto-auth feature
- Uses same JWT signing infrastructure
- Shares OAuth client registry
- Consistent security policies

---

## Performance Considerations

### Caching Strategy

**Redis Caching:**
```
app:list:{user_id}         # Cached app list per user (TTL: 5 min)
app:details:{app_id}       # App details (TTL: 1 hour)
app:access:{user_id}:{app_id}  # Access check result (TTL: 5 min)
```

**Cache Invalidation:**
- On app update: Invalidate `app:details:{app_id}` and `app:list:*`
- On access rule update: Invalidate `app:access:*:{app_id}`
- On user subscription change: Invalidate `app:access:{user_id}:*`

### Database Optimization

**Indexes:**
```sql
CREATE INDEX idx_apps_active ON apps(is_active);
CREATE INDEX idx_apps_created_by ON apps(created_by);
CREATE INDEX idx_access_rules_app_id ON access_rules(app_id);
CREATE INDEX idx_access_rules_user_id ON access_rules USING GIN(user_ids);
CREATE INDEX idx_user_prefs_user_app ON user_app_preferences(user_id, app_client_id);
CREATE INDEX idx_user_prefs_favorite ON user_app_preferences(is_favorite);
```

### Pagination

- Admin list: 25 apps per page (server-side)
- User library: Load all (client-side filtering)
- Usage stats: 30 days default (customizable)

---

## Integration Points

### 1. Auto-Auth Feature

**Dependencies:**
- OAuth client registry (shared table)
- OAuth authorization flow
- JWT token infrastructure

**Integration:**
- App-library manages OAuth client registrations
- Auto-auth handles OAuth protocol implementation
- Shared `oauth_clients` table

### 2. User Management Feature

**Dependencies:**
- User search for access control
- User subscription data

**Integration:**
- Uses user search endpoint for access control UI
- Fetches subscription tier for subscription-based access

### 3. Subscription Management Feature

**Dependencies:**
- Subscription tier information

**Integration:**
- Evaluates subscription tier for access control
- Future: Display app availability based on subscription

---

## Testing Strategy

### Unit Tests

**Domain Logic:**
- `check_user_access()` with all access modes
- Client ID generation
- Client secret generation
- Usage stats aggregation

**Repositories:**
- CRUD operations
- Access rule queries
- Usage event queries

### Integration Tests

**API Endpoints:**
- Get available apps (with/without auth)
- Create app (success, validation errors)
- Update app (success, unauthorized)
- Delete app (success, with active users)
- Access control (all modes)
- Usage stats

### E2E Tests

**User Flows:**
1. User views library → Launches app → OAuth succeeds
2. Admin creates app → User sees app → User launches app
3. Admin disables app → User no longer sees app
4. Admin sets "only specified users" → Only those users see app

---

## Migration Strategy

### Phase 1: Foundation (Week 1)

- [ ] Create database schema
- [ ] Implement shared models
- [ ] Create back-api endpoints (basic CRUD)

### Phase 2: Admin UI (Week 2)

- [ ] Build admin application list
- [ ] Build admin create/edit forms
- [ ] Implement access control UI

### Phase 3: User Library (Week 3)

- [ ] Build user library dashboard
- [ ] Integrate OAuth launch
- [ ] Implement favorites/recent

### Phase 4: Usage Analytics (Week 4)

- [ ] Implement usage tracking
- [ ] Build usage stats aggregation
- [ ] Build admin analytics UI

### Phase 5: Testing & Polish (Week 5)

- [ ] Write comprehensive tests
- [ ] Performance optimization
- [ ] Documentation
- [ ] Deployment

---

**Document Owner:** Engineering Team
**Last Reviewed:** 2025-11-15
**Next Review:** 2025-12-15
